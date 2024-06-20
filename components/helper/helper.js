const fs = require('fs-extra');
const csv = require('csv-parser');
const VCard = require('vcf');
const xlsx = require('xlsx');

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

function createVCard(contact) {
    var vCard = new VCard();
    vCard.set('fn', contact.name);
    vCard.set('tel', contact.phone);
    if (contact.email) vCard.set('email', contact.email);
    if (contact.address) vCard.set('adr', contact.address);
    return vCard.toString();
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

async function convertCSVtoVCF(csvFilePath, vcfFilePath, maxContacts) {
    var contacts = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row) => {
                contacts.push(row);
                if (contacts.length === maxContacts) {
                    writeContactsToVCF(contacts, vcfFilePath);
                    contacts.length = 0;
                }
            })
            .on('end', () => {
                if (contacts.length > 0) {
                    writeContactsToVCF(contacts, vcfFilePath);
                }
                resolve();
            })
            .on('error', reject);
    });
}

async function convertTXTtoVCF(txtFilePath, vcfFilePath, maxContacts) {
    var contacts = [];
    var data = await fs.readFile(txtFilePath, 'utf-8');
    var lines = data.split('\n').filter(line => line.trim())

    var contactIndex = 1;

    lines.forEach((line) => {
        var phone = line.trim();
        var name = `Contact ${contactIndex}`;

        contacts.push({ name, phone, email: '', address: '' });
        contactIndex++;

        if (contacts.length === maxContacts) {
            writeContactsToVCF(contacts, vcfFilePath);
            contacts.length = 0;
        }
    });

    if (contacts.length > 0) {
        writeContactsToVCF(contacts, vcfFilePath);
    }
}

function writeContactsToVCF(contacts, vcfFilePath) {
    var vcfData = contacts.map(createVCard).join('\n');
    fs.appendFileSync(vcfFilePath, vcfData);
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
                name: fn,
                phone: tel,
                email: email,
                address: adr
            });
        });
    } else if (vCards) {
        const fn = vCards.get('fn') ? vCards.get('fn').valueOf() : '';
        const tel = vCards.get('tel') ? vCards.get('tel').valueOf() : '';
        const email = vCards.get('email') ? vCards.get('email').valueOf() : '';
        const adr = vCards.get('adr') ? vCards.get('adr').valueOf() : '';

        contacts.push({
            name: fn,
            phone: tel,
            email: email,
            address: adr
        });
    }

    var csvData = contacts.map((contact) =>
        `${contact.name},${contact.phone},${contact.email},${contact.address}`
    ).join('\n');

    await fs.writeFile(csvFilePath, csvData);
}

async function convertXLSXtoVCF(xlsxFilePath, vcfFilePath, maxContacts) {
    var workbook = xlsx.readFile(xlsxFilePath);
    var sheetName = workbook.SheetNames[0];
    var worksheet = workbook.Sheets[sheetName];
    var jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    var contacts = [];
    let contactIndex = 1;

    for (const row of jsonData) {
        for (const cell of row) {
            if (cell && typeof cell === 'string' && cell.match(/^\+?[0-9\s-]+$/)) {
                const contact = {
                    name: `Contact ${contactIndex}`,
                    phone: cell.trim(),
                    email: '',
                    address: ''
                };
                contacts.push(contact);
                contactIndex++;

                if (contacts.length === maxContacts) {
                    writeContactsToVCF(contacts, vcfFilePath);
                    contacts.length = 0;
                }
            }
        }
    }

    if (contacts.length > 0) {
        writeContactsToVCF(contacts, vcfFilePath);
    }
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
