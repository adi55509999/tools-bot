const { bot, prop } = require('./message.js')
const variables = require('./variables.js')
const helper = require('./components/helper/helper.js')
const { markup, btn } = require('./components/keyboard/inline.js')
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios')

bot.on(`callback_query`, async ctx => {
    try {
        var chatID = ctx.chat.id;
        if (variables.userList.indexOf(chatID) == -1 ) return await ctx.answerCbQuery(`⚠️ This bot is not for you.`, { show_alert: true })

        var cb = ctx.callbackQuery;
        var data = await cb.data
        var cck;
        var keyb = []

        if (/cancel_$/i.exec(data)) {
            prop.read(`session_convert_` + chatID)
            prop.read(`session_convertMaxContacts_` + chatID)
            prop.read(`session_convertCustomName_` + chatID)
            await ctx.editMessageText(`❌ Dibatalkan.`)
            return;
        }

        if (cck = /convert_(.+)_(.+)/i.exec(data)) {
            var type = cck[1]
            var IDs = cck[2]

            if (type == 'start') {
                var pesan = `❇️ Kirimkan saya dokumen yang ingin Anda konversikan.`
                keyb[0] = [
                    btn.text(`❌ Batal`, `cancel_`)
                ]

                await ctx.editMessageText(pesan, { parse_mode: 'HTML', reply_markup: markup.inlineKeyboard(keyb) })
                await ctx.answerCbQuery('')
                prop.set(`session_convert_` + chatID, true)
                return;
            }

            var files = prop.get(`files_` + IDs + chatID)
            if (!files) return await ctx.answerCbQuery(`⚠️ Tombol kadaluarsa.`, { show_alert: true })
            
            try {
                var pros = await ctx.editMessageText(`⏳ Memproses...`)
                var doc = files.split(',')
                var mimeType = doc[2].toLowerCase()

                if (type.includes('csvToVcf')) {
                    if (mimeType !== 'text/csv') { var r = false; var act = `CSV ke VCF` } else { var r = true }
                } else if (type.includes('txtToVcf')) {
                    if (mimeType !== 'text/plain') { var r = false; var act = `TXT ke VCF` } else { var r = true }
                } else if (type.includes('vcfToCsv')) {
                    if (mimeType !== 'text/x-vcard') { var r = false; var act = `VCF ke CSV` } else { var r = true }
                } else if (type.includes('xlsxToVcf')) {
                    if (mimeType !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') { var r = false; var act = `XLSX ke VCF` } else { var r = true }
                }

                if (r == false) {
                    await ctx.answerCbQuery(`⚠️ Ekstensi Tidak Valid!\nJika Anda ingin mengubah ${act}, maka kirimkan file dengan ekstensi ${act.split(' ')[0]}.`, { show_alert: true })
                    
                    var pesan = `❇️ <b>Oke!</b>`
                    pesan += `\nManakah dari opsi dibawah ini yang Anda inginkan?`
                    keyb[0] = [
                        btn.text(`Ubah CSV ke VCF`, `convert_csvToVcf_${IDs}`)
                    ]
                    keyb[1] = [
                        btn.text(`Ubah TXT ke VCF`, `convert_txtToVcf_${IDs}`)
                    ]
                    keyb[2] = [
                        btn.text(`Ubah VCF ke CSV`, `convert_vcfToCsv_${IDs}`)
                    ]
                    keyb[3] = [
                        btn.text(`Ubah XLSX ke VCF`, `convert_xlsxToVcf_${IDs}`)
                    ]

                    await ctx.editMessageText(pesan, { parse_mode: 'HTML', reply_markup: markup.inlineKeyboard(keyb) })
                    await ctx.answerCbQuery('')
                    return;
                }

                if (!prop.get(`skipMaxContacts_` + IDs + chatID)) {
                    var pesan = `❇️ <b>Oke!</b>\nMasukkan jumlah kontak per-file yang Anda inginkan, jika ini dilewati, maka akan menggunakan bawaan ${variables.maxCon} kontak per-file.`
                    pesan += `\n\nℹ️ Anda hanya bisa menggunakan angka rentang 1 - 1000.`
                    keyb[0] = [
                        btn.text(`Lewati ⏩`, `convert_${type}_${IDs}`)
                    ]
                    keyb[1] = [
                        btn.text(`❌ Batal`, `cancel_`)
                    ]

                    await ctx.editMessageText(pesan, { parse_mode: 'HTML', reply_markup: markup.inlineKeyboard(keyb) })
                    await ctx.answerCbQuery('')
                    prop.set(`skipMaxContacts_` + IDs + chatID, true)
                    prop.set(`selection_` + IDs + chatID, type.split('-')[0])
                    prop.set(`session_convertMaxContacts_` + chatID, IDs)
                    return;
                }

                if (!prop.get(`skipCustomName_` + IDs + chatID)) {
                    var pesan = `❇️ <b>Tentu!</b>\nMasukkan nama kustom yang Anda inginkan.`
                    keyb[0] = [
                        btn.text(`Lewati ⏩`, `convert_${type}_${IDs}`)
                    ]
                    keyb[1] = [
                        btn.text(`❌ Batal`, `cancel_`)
                    ]

                    await ctx.editMessageText(pesan, { parse_mode: 'HTML', reply_markup: markup.inlineKeyboard(keyb) })
                    await ctx.answerCbQuery('')
                    prop.read(`session_convertMaxContacts_` + chatID)
                    prop.set(`skipCustomName_` + IDs + chatID, true)
                    prop.set(`session_convertCustomName_` + chatID, IDs)
                    return;
                }

                prop.read(`session_convertCustomName_` + chatID)
                var fileLink = (await bot.telegram.getFileLink(doc[0])).href
                var filePath = path.join(__dirname, 'downloads', doc[1]);
                fs.ensureDirSync(path.dirname(filePath));

                var response = await axios.get(fileLink, { responseType: 'arraybuffer' });
                await fs.writeFile(filePath, response.data);
                var outputFilePath;
                var getMaxContacts = prop.get(`max_contacts_` + IDs + chatID)
                var maxContacts = getMaxContacts ? Number(getMaxContacts) : variables.maxCon

                if (type == `csvToVcf`) {
                    outputFilePath = filePath.replace('.csv', '.vcf');
                    var extensi = `VCF`
                    var fileConverted = await helper.convertCSVtoVCF(filePath, outputFilePath, maxContacts);
                }

                if (type == `txtToVcf`) {
                    outputFilePath = filePath.replace('.txt', '.vcf');
                    var extensi = `VCF`
                    var fileConverted = await helper.convertTXTtoVCF(filePath, outputFilePath, maxContacts);
                }

                if (type == `vcfToCsv`) {
                    outputFilePath = filePath.replace('.vcf', '.csv');
                    var extensi = `CSV`
                    var fileConverted = await helper.convertVCFtoCSV(filePath, outputFilePath, maxContacts);
                }

                if (type == `xlsxToVcf`) {
                    outputFilePath = filePath.replace('.xlsx', '.vcf');
                    var extensi = `VCF`
                    var fileConverted = await helper.convertXLSXtoVCF(filePath, outputFilePath, maxContacts);
                }

                var fileLength = fileConverted.length
                var count = 0
                if (fileLength == 1) {
                    var caps = `✅ <b>Well Done!</b>\nBerhasil mengkonversi ${doc[1]} ke ${extensi}.`
                } else {
                    var caps = `✅ <b>Well Done!</b>\nBerhasil mengkonversi semua file ke ${extensi}.`
                }

                for (const file of fileConverted) {
                    count++;
                    if (count == fileLength) {
                        await ctx.replyWithDocument({ source: file }, { caption: caps, parse_mode: 'HTML' });
                    } else {
                        await ctx.replyWithDocument({ source: file }, { parse_mode: 'HTML' });
                    }
                    await fs.remove(file)
                }
                await fs.remove(filePath);
                try { await ctx.deleteMessage(pros.message_id) } catch { }
            } catch(e) {
                console.log(e)
                var pesan = `❌ <b>Error!</b>\n${e.message}`
                keyb[0] = [
                    btn.text(`🔄 Ulangi`, `conver_start`)
                ]

                prop.read(`session_convert_` + chatID)
                prop.read(`session_convertMaxContacts_` + chatID)
                prop.read(`session_convertCustomName_` + chatID)
                await ctx.editMessageText(pesan, { parse_mode: 'HTML', reply_markup: markup.inlineKeyboard(keyb) })
            }
            return;
        }
    } catch (e) {
        console.log(e)
        var pesan = `❌ <b>Error!</b>\n${e.message}`
        await ctx.editMessageText(pesan, { parse_mode: 'HTML' })
    }
})

module.exports = { bot }