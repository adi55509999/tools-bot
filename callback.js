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
        if (variables.userList.indexOf(chatID) == -1 ) return await ctx.answerCbQuery(`⚠️ You're not authorized.`, { show_alert: true })

        var cb = ctx.callbackQuery;
        var data = await cb.data
        var cck;
        var keyb = []

        if (/cancel_$/i.exec(data)) {
            prop.read(`session_convert_` + chatID)
            prop.read(`session_convertMaxContacts_` + chatID)
            prop.read(`session_convertCustomName_` + chatID)
            prop.read(`session_convertFileNames_` + chatID)
            prop.read(`session_convertCustomIndex_` + chatID)
            await ctx.editMessageText(`❌ Dibatalkan.`)
            return;
        }

        if (/close_$/i.exec(data)) {
            try { await ctx.deleteMessage(ctx.message?.message_id) } catch { }
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
                    if (mimeType !== 'text/csv') { var r = false; var act = `mengubah CSV ke VCF` } else { var r = true }
                } else if (type.includes('txtToVcf')) {
                    if (mimeType !== 'text/plain') { var r = false; var act = `mengubah TXT ke VCF` } else { var r = true }
                } /*else if (type.includes('vcfToCsv')) {
                    if (!/(text\/x-vcard|text\/vcard)/i.exec(mimeType)) { var r = false; var act = `VCF ke CSV` } else { var r = true }
                }*/ else if (type.includes('xlsxToVcf')) {
                    if (mimeType !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') { var r = false; var act = `mengubah XLSX ke VCF` } else { var r = true }
                } /*else if (type.includes('vcfToTxt')) {
                    if (!/(text\/x-vcard|text\/vcard)/i.exec(mimeType)) { var r = false; var act = `VCF ke TXT` } else { var r = true }
                }*/ else if (type.includes('trimVcf')) {
                    if (!/(text\/x-vcard|text\/vcard)/i.exec(mimeType)) { var r = false; var act = `memecah file VCF`; var sec = 2 } else { var r = true }
                }

                if (r == false) {
                    await ctx.answerCbQuery(`⚠️ Ekstensi Tidak Valid!\nJika Anda ingin ${act}, maka kirimkan file dengan ekstensi ${act.split(' ')[sec ? sec : 1]}.`, { show_alert: true })
                    
                    var pesan = `❇️ <b>Oke!</b>`
                    pesan += `\nManakah dari opsi dibawah ini yang Anda inginkan?`
                    keyb[0] = [
                        btn.text(`Ubah CSV ke VCF`, `convert_csvToVcf_${IDs}`)
                    ]
                    keyb[1] = [
                        btn.text(`Ubah TXT ke VCF`, `convert_txtToVcf_${IDs}`)
                    ]
                    /*keyb[2] = [
                        btn.text(`Ubah VCF ke CSV`, `convert_vcfToCsv_${IDs}`)
                    ]*/
                    keyb[2] = [
                        btn.text(`Ubah XLSX ke VCF`, `convert_xlsxToVcf_${IDs}`)
                    ]
                    keyb[3] = [
                        btn.text(`Bagi File VCF`, `convert_trimVcf_${IDs}`)
                    ]
                    /*keyb[4] = [
                        btn.text(`Ubah VCF ke TXT`, `convert_vcfToTxt_${IDs}`)
                    ]*/

                    await ctx.editMessageText(pesan, { parse_mode: 'HTML', reply_markup: markup.inlineKeyboard(keyb) })
                    await ctx.answerCbQuery('')
                    return;
                }

                if (!prop.get(`skipMaxContacts_` + IDs + chatID)) {
                    var pesan = `❇️ <b>Oke!</b>\nMasukkan jumlah kontak per-file yang Anda inginkan. ${(type == 'trimVcf') ? `Anda tidak dapat melewati bagian ini` : `Jika ini dilewati, maka akan menggunakan bawaan ${variables.maxCon} kontak per-file.`}`
                    pesan += `\n\nℹ️ Anda hanya bisa menggunakan angka rentang 1 - ${variables.maxCon}.`
                    if (type !== 'trimVcf') {
                        keyb[0] = [
                            btn.text(`Lewati ⏩`, `convert_${type}_${IDs}`)
                        ]
                        keyb[1] = [
                            btn.text(`❌ Batal`, `cancel_`)
                        ]
                    } else {
                        keyb[0] = [
                            btn.text(`❌ Batal`, `cancel_`)
                        ]
                    }

                    await ctx.editMessageText(pesan, { parse_mode: 'HTML', reply_markup: markup.inlineKeyboard(keyb) })
                    await ctx.answerCbQuery('')
                    prop.set(`skipMaxContacts_` + IDs + chatID, true)
                    prop.set(`selection_` + IDs + chatID, type)
                    prop.set(`session_convertMaxContacts_` + chatID, IDs)
                    return;
                }
    
                if (!prop.get(`skipFileNames_` + IDs + chatID)) {
                    var pesan = `❇️ <b>Tentu!</b>\nMasukkan nama file kustom yang Anda inginkan.`
                    keyb[0] = [
                        btn.text(`Lewati ⏩`, `convert_${type}_${IDs}`)
                    ]
                    keyb[1] = [
                        btn.text(`❌ Batal`, `cancel_`)
                    ]

                    await ctx.editMessageText(pesan, { parse_mode: 'HTML', reply_markup: markup.inlineKeyboard(keyb) })
                    await ctx.answerCbQuery('')
                    prop.read(`session_convertMaxContacts_` + chatID)
                    prop.set(`skipFileNames_` + IDs + chatID, true)
                    prop.set(`session_convertFileNames_` + chatID, IDs)
                    return;
                }

                if (type !== 'trimVcf') {
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
                        prop.read(`session_convertFileNames_` + chatID)
                        prop.set(`skipCustomName_` + IDs + chatID, true)
                        prop.set(`session_convertCustomName_` + chatID, IDs)
                        return;
                    }

                    if (!prop.get(`skipCustomIndex_` + IDs + chatID)) {
                        var pesan = `❇️ <b>Tentu!</b>\nMasukkan permulaan indexing pada file. Jika Anda tidak mengatur ini, maka indexing pada file akan dimulai pada angka 1.`
                        keyb[0] = [
                            btn.text(`Lewati ⏩`, `convert_${type}_${IDs}`)
                        ]
                        keyb[1] = [
                            btn.text(`❌ Batal`, `cancel_`)
                        ]

                        await ctx.editMessageText(pesan, { parse_mode: 'HTML', reply_markup: markup.inlineKeyboard(keyb) })
                        await ctx.answerCbQuery('')
                        prop.read(`session_convertFileNames_` + chatID)
                        prop.set(`skipCustomIndex_` + IDs + chatID, true)
                        prop.set(`session_convertCustomIndex_` + chatID, IDs)
                        return;
                    }
                }

                prop.read(`session_convertCustomIndex_` + chatID)
                var fileLink = (await bot.telegram.getFileLink(doc[0])).href
                var filePath = path.join(__dirname, 'downloads', doc[1]);
                fs.ensureDirSync(path.dirname(filePath));

                var response = await axios.get(fileLink, { responseType: 'arraybuffer' });
                await fs.writeFile(filePath, response.data);
                var outputFilePath;
                var getMaxContacts = prop.get(`max_contacts_` + IDs + chatID)
                var maxContacts = getMaxContacts ? Number(getMaxContacts) : variables.maxCon
                var customName = prop.get(`custom_name_` + IDs + chatID)

                if (type == `csvToVcf`) {
                    outputFilePath = filePath.replace('.csv', '.vcf');
                    var extensi = `VCF`
                    var fileConverted = await helper.convertCSVtoVCF(filePath, outputFilePath, maxContacts, prop, chatID, IDs, customName);
                }

                if (type == `txtToVcf`) {
                    outputFilePath = filePath.replace('.txt', '.vcf');
                    var extensi = `VCF`
                    var fileConverted = await helper.convertTXTtoVCF(filePath, outputFilePath, maxContacts, prop, chatID, IDs, customName);
                }

                /*if (type == `vcfToCsv`) {
                    outputFilePath = filePath.replace('.vcf', '.csv');
                    var extensi = `CSV`
                    var fileConverted = await helper.convertVCFtoCSV(filePath, outputFilePath, prop, chatID, IDs);
                }*/

                if (type == `xlsxToVcf`) {
                    outputFilePath = filePath.replace('.xlsx', '.vcf');
                    var extensi = `VCF`
                    var fileConverted = await helper.convertXLSXtoVCF(filePath, outputFilePath, maxContacts, prop, chatID, IDs, customName);
                }

                /*if (type == 'vcfToTxt') {
                    outputFilePath = filePath.replace('.vcf', '.txt');
                    var extensi = `TXT`
                    var fileConverted = await helper.convertVCFtoTXT(filePath, outputFilePath, prop, chatID, IDs);
                }*/

                if (type == 'trimVcf') {
                    var extensi = `VCF`
                    var fileSplit = await helper.splitVCF(filePath, doc[1], maxContacts, prop, chatID, IDs)
                }

                var fileExist = fileConverted ? fileConverted : fileSplit
                await helper.sendFile(fileExist, filePath, ctx, pros.message_id, type, extensi, doc, chatID, IDs, prop)
                prop.read(`skipMaxContacts_` + IDs + chatID)
                prop.read(`skipFileNames_` + IDs + chatID)
                prop.read(`skipCustomName_` + IDs + chatID)
                prop.read(`skipCustomIndex_` + IDs + chatID)
                prop.read(`session_convertMaxContacts_` + chatID)
                prop.read(`session_convertCustomName_` + chatID)
                prop.read(`session_convertFileNames_` + chatID)
                prop.read(`session_convertCustomIndex_` + chatID)
            } catch(e) {
                console.log(e)
                var pesan = `❌ <b>Error!</b>\n${e.message}`
                keyb[0] = [
                    btn.text(`🔄 Ulangi`, `convert_start`)
                ]

                prop.read(`session_convert_` + chatID)
                prop.read(`session_convertMaxContacts_` + chatID)
                prop.read(`session_convertCustomName_` + chatID)
                prop.read(`session_convertFileNames_` + chatID)
                prop.read(`session_convertCustomIndex_` + chatID)
                await ctx.editMessageText(pesan, { parse_mode: 'HTML', reply_markup: markup.inlineKeyboard(keyb) })
            }
            return;
        }
    } catch (e) {
        var pesan = `❌ <b>Error!</b>\n${e.message}`
        await ctx.editMessageText(pesan, { parse_mode: 'HTML' })
    }
})

module.exports = { bot }