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

function writeContactsToVCF(contacts, vcfFilePath, customName, prop, IDs, chatID) {
    var datas = ''
    var customIndex = prop.get(`custom_index_` + IDs + chatID)
    var idx = customIndex ? Number(customIndex) : 0

    contacts.map(contact => {
        idx++
        if (customName) { var ccnt = (idx == 1) ? `${customName}` : `${customName} ${idx}` } else { var ccnt = contact.name ? contact.name : `Contact ${idx}` }

        datas += `BEGIN:VCARD\n`
        datas += `VERSION:3.0\n`
        datas += `N:${ccnt}\n`
        datas += `TEL;TYPE=CELL:${contact.phone}\n`
        datas += `END:VCARD\n`;
    })

    fs.appendFileSync(vcfFilePath, datas + '\n');
}

function getNewVcfFilePath(vcfFilePath, count, prop, chatID, IDs) {
    var ext = path.extname(vcfFilePath);
    var base = path.basename(vcfFilePath, ext);
    var dir = path.dirname(vcfFilePath);
    if (count == 1) { var ccnt = `` } else { var ccnt = `_${count}` }

    var customFile = prop.get(`custom_file_` + IDs + chatID)
    var files = customFile ? `${customFile}${ccnt}` : `${base}${ccnt}`

    return path.join(dir, `${files}${ext}`);
}

async function convertCSVtoVCF(csvFilePath, vcfFilePath, maxContacts, prop, chatID, IDs, customName = null) {
    var contacts = [];
    var fileCount = 1;
    var generatedFiles = [];

    return new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (row) => {
                contacts.push(row);
                if (contacts.length === maxContacts) {
                    var newVcfFilePath = getNewVcfFilePath(vcfFilePath, fileCount, prop, chatID, IDs);
                    writeContactsToVCF(contacts, newVcfFilePath, customName, prop, IDs, chatID);
                    generatedFiles.push(newVcfFilePath);
                    contacts.length = 0;
                    fileCount++;
                }
            })
            .on('end', () => {
                if (contacts.length > 0) {
                    var newVcfFilePath = getNewVcfFilePath(vcfFilePath, fileCount, prop, chatID, IDs);
                    writeContactsToVCF(contacts, newVcfFilePath, customName, prop, IDs, chatID);
                    generatedFiles.push(newVcfFilePath);
                }
                resolve(generatedFiles);
            })
            .on('error', reject);
    });
}

async function convertTXTtoVCF(txtFilePath, vcfFilePath, maxContacts, prop, chatID, IDs, customName = null) {
    var contacts = [];
    let fileCount = 1;
    var generatedFiles = [];

    var data = await fs.readFile(txtFilePath, 'utf-8');
    var lines = data.split('\n');

    lines.forEach((line, index) => {
        var [name, phone] = line.split(',');

        if (!phone) {
            var toNumber = Number(name)
            if (isNaN(toNumber) == false) {
                var phn = name
            } else {
                var phn = ''
            }
        } else {
            var phn = phone
        }

        if (!name && customName) {
            var nms = name
        } else if (!name && !customName) {
            var nms = `Contact ${index + 1}`
        }

        var contact = {
            name: nms,
            phone: phn
        };
        contacts.push(contact);

        if (contacts.length === maxContacts) {
            var newVcfFilePath = getNewVcfFilePath(vcfFilePath, fileCount, prop, chatID, IDs);
            writeContactsToVCF(contacts, newVcfFilePath, customName, prop, IDs, chatID);
            generatedFiles.push(newVcfFilePath);
            contacts.length = 0;
            fileCount++;
        }
    });

    if (contacts.length > 0) {
        var newVcfFilePath = getNewVcfFilePath(vcfFilePath, fileCount, prop, chatID, IDs);
        writeContactsToVCF(contacts, newVcfFilePath, customName, prop, IDs, chatID);
        generatedFiles.push(newVcfFilePath);
    }

    return generatedFiles;
}

/**
 * THIS FEATURE WAS CANCELLED.
 */
/*async function convertVCFtoCSV(vcfFilePath, csvFilePath, prop, chatID, IDs, customName = null) {
    var data = await fs.readFile(vcfFilePath, 'utf-8');
    var vCards = new VCard().parse(data);
    var contacts = [];
    var index = 1

    if (Array.isArray(vCards)) {
        vCards.forEach((vCard, index) => {
            const fn = vCard.get('n') ? vCard.get('n').valueOf() : vCard.get('fn').valueOf();
            const tel = vCard.get('tel') ? vCard.get('tel').valueOf() : '';

            contacts.push({
                name: customName ? `${customName} ${index++}` : fn.replace(/^FN:/i, '').replace(/^N:/i, '').trim(),
                phone: tel.replace(/^TEL;TYPE:CELL:/i, '').trim()
            });
        });
    } else if (vCards) {
        const fn = vCards.get('n') ? vCards.get('n').valueOf() : vCards.get('fn').valueOf();
        const tel = vCards.get('tel') ? vCards.get('tel').valueOf() : '';

        contacts.push({
            name: customName ? `${customName} ${index++}` : fn.replace(/^FN:/i, '').replace(/^N:/i, '').trim(),
            phone: tel.replace(/^TEL;TYPE:CELL:/i, '').trim()
        });
    }
    var cusFile = prop.get(`custom_file_` + chatID + IDs)
    var finalCsvFilePath = cusFile ? path.join(path.dirname(csvFilePath), cusFile) : csvFilePath;
    
    var csvWriter = createCsvWriter({
        path: finalCsvFilePath,
        header: [
            { id: 'name', title: 'Name' },
            { id: 'phone', title: 'Phone' },
            { id: 'email', title: 'Email' },
            { id: 'address', title: 'Address' },
        ]
    });

    await csvWriter.writeRecords(contacts);
}*/

async function convertXLSXtoVCF(xlsxFilePath, vcfFilePath, maxContacts, prop, chatID, IDs, customName = null) {
    var contacts = [];
    let fileCount = 1;
    var generatedFiles = [];

    var workbook = xlsx.readFile(xlsxFilePath);
    var sheetName = workbook.SheetNames[0];
    var sheet = workbook.Sheets[sheetName];
    var rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    rows.forEach((row, index) => {
        var [name, phone] = row;
        if (!phone) {
            var toNumber = Number(name)
            if (isNaN(toNumber) == false) {
                var phn = name
            } else if (String(name).startsWith('+')) {
                var phn = name
            } else {
                var phn = ''
            }
        } else {
            var phn = phone
        }

        if (!name && customName) {
            var nms = `${customName} ${index + 1}`
        } else if (name && !customName) {
            var nms = name
        } else if (!name && !customName) {
            var nms = `Contact ${index + 1}`
        }

        var contact = {
            name: nms,
            phone: phn
        };
        contacts.push(contact);

        if (contacts.length === maxContacts) {
            var newVcfFilePath = getNewVcfFilePath(vcfFilePath, fileCount, prop, chatID, IDs);
            writeContactsToVCF(contacts, newVcfFilePath, customName, prop, IDs, chatID);
            generatedFiles.push(newVcfFilePath);
            contacts.length = 0;
            fileCount++;
        }
    });

    if (contacts.length > 0) {
        var newVcfFilePath = getNewVcfFilePath(vcfFilePath, fileCount, prop, chatID, IDs);
        writeContactsToVCF(contacts, newVcfFilePath, customName, prop, IDs, chatID);
        generatedFiles.push(newVcfFilePath);
    }

    return generatedFiles;
}

async function splitVCF(filePath, fileName, chunkSize, prop, chatID, IDs) {
    var content = fs.readFileSync(filePath, 'utf-8')
    var vcards = content.split(/(?=BEGIN:VCARD)/).filter(Boolean);
    var chunks = [];

    for (let i = 0; i < vcards.length; i += chunkSize) {
        chunks.push(vcards.slice(i, i + chunkSize).join(''));
    }

    var cusFile = prop.get(`custom_file_` + IDs + chatID) ? prop.get(`custom_file_` + IDs + chatID) : fileName
    var outputDir = 'downloads'
    var filePaths = []
    chunks.forEach((chunk, index) => {
        var fileName = path.join(outputDir, `${cusFile.replace(/\.vcf/i, '')} ${index + 1}.vcf`);
        fs.writeFileSync(fileName, chunk);
        filePaths.push(fileName);
    });
    return filePaths;
}

/**
 * THIS FEATURE WAS CANCELLED.
 */
/*async function convertVCFtoTXT(vcfFilePath, txtFilePath, prop, chatID, IDs, customName = null) {
    var data = await fs.promises.readFile(vcfFilePath, 'utf-8');
    var vCard = VCard.parse(data)
    var contacts = [];
    var index = 1

    if (Array.isArray(vCard)) {
        vCard.forEach(card => {
            const fn = card.get('n') ? card.get('n').valueOf() : card.get('fn').valueOf();
            const tel = card.get('tel') ? card.get('tel').valueOf() : '';

            contacts.push(`Name: ${customName ? `${customName} ${index++}` : fn}, Phone: ${tel}`);
        });
    } else if (vCard) {
        const fn = vCard.get('n') ? vCard.get('n').valueOf() : vCard.get('fn').valueOf();
        const tel = vCard.get('tel') ? vCard.get('tel').valueOf() : '';

        contacts.push(`Name: ${customName ? `${customName} ${index++}` : fn}, Phone: ${tel}`);
    }

    var txtData = contacts.join('\n');
    var cusFile = prop.get(`custom_file_` + chatID + IDs)
    var finalTxtFilePath = cusFile ? path.join(path.dirname(txtFilePath), cusFile) : txtFilePath;

    await fs.promises.writeFile(finalTxtFilePath, txtData, 'utf-8');
}*/

const helper = {
    convertCSVtoVCF,
    convertTXTtoVCF,
    convertXLSXtoVCF,
    splitVCF,
    getName,
    clearHTML,
    createID
}
module.exports = helper