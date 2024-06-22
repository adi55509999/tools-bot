const fs = require('fs-extra');
const csv = require('csv-parser');
const VCard = require('vcf');
const xlsx = require('xlsx');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');

async function getName(ctx) {
    var name = await clearHTML(ctx.from.first_name)
    var userID = ctx.from.id;
    var username = ctx.from.username;

    var p = username ? `@${username}` : `<a href='tg://user?id=${userID}'>${name}</a>`
    return p;
}

async function clearHTML(s) {
    if (!s) return s
    return s
        .replace(/</g, '')
        .replace(/>/g, '')
}

async function createID(length) {
    var result = [];
    var panjangKode = Number(length);
    var characters =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    var panjangkarakter = characters.length;

    for (var i = 0; i < panjangKode; i++) {
        result.push(characters.charAt(Math.floor(Math.random() * panjangkarakter)));
    }

    var r = result.join("");
    return r;
}

function writeContactsToVCF(contacts, vcfFilePath, customName) {
    var datas = ''

    contacts.map(contact => {
        datas += `BEGIN:VCARD\n`
        datas += `VERSION:4.0\n`
        if ((!contact.name && customName) || (contact.name && customName)) { datas += `N:${customName}\n` } else if (contact.name && !customName) { datas += `N:${contact.name}\n` } else if (!contact.name && !customName) { datas += `` }
        if (contact.phone) { datas += `TEL;TYPE=CELL:${contact.phone}\n` } else { datas += `` }
        datas += `END:VCARD\n`;
    })

    fs.appendFileSync(vcfFilePath, datas + '\n');
}

function getNewVcfFilePath(vcfFilePath, count) {
    var ext = path.extname(vcfFilePath);
    var base = path.basename(vcfFilePath, ext);
    var dir = path.dirname(vcfFilePath);
    return path.join(dir, `${base}_${count}${ext}`);
}

async function convertCSVtoVCF(csvFilePath, vcfFilePath, maxContacts, customName = null) {
    var contacts = [];
    var fileCount = 1;
    var generatedFiles = [];

    return new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row) => {
                contacts.push(row);
                if (contacts.length === maxContacts) {
                    var newVcfFilePath = getNewVcfFilePath(vcfFilePath, fileCount);
                    writeContactsToVCF(contacts, newVcfFilePath, customName);
                    generatedFiles.push(newVcfFilePath);
                    contacts.length = 0;
                    fileCount++;
                }
            })
            .on('end', () => {
                if (contacts.length > 0) {
                    var newVcfFilePath = getNewVcfFilePath(vcfFilePath, fileCount);
                    writeContactsToVCF(contacts, newVcfFilePath, customName);
                    generatedFiles.push(newVcfFilePath);
                }
                resolve(generatedFiles);
            })
            .on('error', reject);
    });
}

async function convertTXTtoVCF(txtFilePath, vcfFilePath, maxContacts, customName = null) {
    var contacts = [];
    let fileCount = 1;
    var generatedFiles = [];

    var data = await fs.readFile(txtFilePath, 'utf-8');
    var lines = data.split('\n');

    lines.forEach((line) => {
        var [name, phone] = line.split(',');
        var contact = {
            name: name || '',
            phone: phone || ''
        };
        contacts.push(contact);

        if (contacts.length === maxContacts) {
            var newVcfFilePath = getNewVcfFilePath(vcfFilePath, fileCount);
            writeContactsToVCF(contacts, newVcfFilePath, customName);
            generatedFiles.push(newVcfFilePath);
            contacts.length = 0;
            fileCount++;
        }
    });

    if (contacts.length > 0) {
        var newVcfFilePath = getNewVcfFilePath(vcfFilePath, fileCount);
        writeContactsToVCF(contacts, newVcfFilePath, customName);
        generatedFiles.push(newVcfFilePath);
    }

    return generatedFiles;
}

async function convertVCFtoCSV(vcfFilePath, csvFilePath) {
    var data = await fs.readFile(vcfFilePath, 'utf-8');
    var vCards = new VCard().parse(data);
    var contacts = [];

    if (Array.isArray(vCards)) {
        vCards.forEach(vCard => {
            const fn = vCard.get('fn') ? vCard.get('fn').valueOf() : '';
            const tel = vCard.get('tel') ? vCard.get('tel').valueOf() : '';
            const email = vCard.get('email') ? vCard.get('email').valueOf() : '';
            const adr = vCard.get('adr') ? vCard.get('adr').valueOf() : '';

            contacts.push({
                name: fn.replace(/^FN:/i, '').trim(),
                phone: tel.replace(/^TEL;TYPE:CELL:/i, '').trim(),
                email: email.replace(/^EMAIL:/i, '').trim(),
                address: adr.replace(/^ADR:/i, '').trim()
            });
        });
    } else if (vCards) {
        const fn = vCards.get('fn') ? vCards.get('fn').valueOf() : '';
        const tel = vCards.get('tel') ? vCards.get('tel').valueOf() : '';
        const email = vCards.get('email') ? vCards.get('email').valueOf() : '';
        const adr = vCards.get('adr') ? vCards.get('adr').valueOf() : '';

        contacts.push({
            name: fn.replace(/^FN:/i, '').trim(),
            phone: tel.replace(/^TEL;TYPE:CELL:/i, '').trim(),
            email: email.replace(/^EMAIL:/i, '').trim(),
            address: adr.replace(/^ADR:/i, '').trim()
        });
    }

    var csvWriter = createCsvWriter({
        path: csvFilePath,
        header: [
            { id: 'name', title: 'Name' },
            { id: 'phone', title: 'Phone' },
            { id: 'email', title: 'Email' },
            { id: 'address', title: 'Address' },
        ]
    });

    await csvWriter.writeRecords(contacts);
}

async function convertXLSXtoVCF(xlsxFilePath, vcfFilePath, maxContacts, customName = null) {
    var contacts = [];
    let fileCount = 1;
    var generatedFiles = [];

    var workbook = xlsx.readFile(xlsxFilePath);
    var sheetName = workbook.SheetNames[0];
    var sheet = workbook.Sheets[sheetName];
    var rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    rows.forEach((row, index) => {
        if (index === 0) return

        var [name, phone] = row;
        var contact = {
            name: name || '',
            phone: phone || ''
        };
        contacts.push(contact);

        if (contacts.length === maxContacts) {
            const newVcfFilePath = getNewVcfFilePath(vcfFilePath, fileCount);
            writeContactsToVCF(contacts, newVcfFilePath);
            generatedFiles.push(newVcfFilePath);
            contacts.length = 0;
            fileCount++;
        }
    });

    if (contacts.length > 0) {
        const newVcfFilePath = getNewVcfFilePath(vcfFilePath, fileCount);
        writeContactsToVCF(contacts, newVcfFilePath);
        generatedFiles.push(newVcfFilePath);
    }

    return generatedFiles;
}

const helper = {
    convertCSVtoVCF,
    convertTXTtoVCF,
    convertVCFtoCSV,
    convertXLSXtoVCF,
    getName,
    clearHTML,
    createID
}
module.exports = helper
