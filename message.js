const { Telegraf } = require('telegraf')
const variables = require('./variables.js')
const helper = require('./components/helper/helper.js')
const { markup, btn } = require('./components/keyboard/inline.js')
const prop = require('./components/property/properties.js')
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios')

const bot = new Telegraf(variables.token)

bot.on(`message`, async ctx => {
    try {
        var chatID = ctx.chat.id
        var keyb = []
        if (variables.userList.indexOf(chatID) == -1) return await ctx.replyWithHTML(`⚠️ You're not authorized.`)

        var pola = /^\/start$/i
        if (pola.exec(ctx.message.text)) {
            var pesan = `👋 Hai ${await helper.getName(ctx)}! Selamat datang di bot ini. Saya dapat membantu Anda dalam melakukan hal berikut:`
            pesan += `\n👉 Mengubah CSV ke VCF.`
            pesan += `\n👉 Mengubah TXT ke VCF.`
            pesan += `\n👉 Mengubah VCF ke CSV.`
            pesan += `\n👉 Mengubah XLSX ke VCF.`
            pesan += `\n\n❔<b>Tata Cara</b>`
            pesan += `\nMulailah dengan menekan tombol dibawah atau mengirim perintah /convert dan kirimkan file yang ingin Anda konversikan.`
            keyb[0] = [
                btn.text(`🛠 Konversi`, `convert_start_none`)
            ]

            await ctx.replyWithHTML(pesan, { reply_markup: markup.inlineKeyboard(keyb) })
            return;
        }

        var pola = /^\/convert$/i
        if (pola.exec(ctx.message.text)) {
            var pesan = `❇️ Kirimkan saya dokumen yang ingin Anda konversikan.`
            keyb[0] = [
                btn.text(`❌ Batal`, `cancel_`)
            ]

            await ctx.replyWithHTML(pesan, { reply_markup: markup.inlineKeyboard(keyb) })
            prop.set(`session_convert_` + chatID, true)
            prop.read(`skipMaxContacts_` + chatID)
            prop.read(`skipFileNames_` + chatID)
            prop.read(`skipCustomName_` + chatID)
            prop.read(`session_convertMaxContacts_` + chatID)
            prop.read(`session_convertCustomName_` + chatID)
            prop.read(`session_convertFileNames_` + chatID)
            return;
        }

        // SESSION
        var getSesCon = prop.get(`session_convert_` + chatID)
        var getSesConMax = prop.get(`session_convertMaxContacts_` + chatID)
        var getSesConCus = prop.get(`session_convertCustomName_` + chatID)
        var getSesConFile = prop.get(`session_convertFileNames_` + chatID)

        if (getSesCon) {
            var pros = await ctx.reply(`⏳ Memproses...`)
            var doc = ctx.message.document
            if (!doc) return await bot.telegram.editMessageText(chatID, pros.message_id, null, `⚠️ Hanya mendukung format dokumen.`)
            var IDs = await helper.createID(10)

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

            prop.set(`files_` + IDs + chatID, `${doc.file_id},${doc.file_name},${doc.mime_type}`)
            prop.read(`session_convert_` + chatID)
            await bot.telegram.editMessageText(chatID, pros.message_id, null, pesan, { parse_mode: 'HTML', reply_markup: markup.inlineKeyboard(keyb) })
            return;
        }

        if (getSesConMax) {
            var IDs = getSesConMax
            var files = prop.get(`files_` + IDs + chatID)
            if (!files) { prop.read(`session_convertMaxContacts_` + chatID); return }
            var pros = await ctx.reply(`⏳ Memproses...`)
            var text = ctx.message.text
            if (!text || /\D+/gi.exec(text)) return await bot.telegram.editMessageText(chatID, pros.message_id, null, `⚠️ Hanya format angka yang diizinkan.`)
            if (Number(text) < 1 || Number(text) > variables.maxCon) return await bot.telegram.editMessageText(chatID, pros.message_id, null, `⚠️ Hanya angka rentang 1 - ${variables.maxCon}.`)
            var ops = prop.get(`selection_` + IDs + chatID)

            var pesan = `❇️ <b>Tentu!</b>\nMasukkan nama file kustom yang Anda inginkan.`
            keyb[0] = [
                btn.text(`Lewati ⏩`, `convert_${ops}_${IDs}`)
            ]
            keyb[1] = [
                btn.text(`❌ Batal`, `cancel_`)
            ]

            prop.set(`max_contacts_` + IDs + chatID, text)
            prop.read(`session_convertMaxContacts_` + chatID)
            prop.set(`skipFileNames_` + IDs + chatID, true)
            prop.set(`session_convertFileNames_` + chatID, IDs)
            await bot.telegram.editMessageText(chatID, pros.message_id, null, pesan, { parse_mode: 'HTML', reply_markup: markup.inlineKeyboard(keyb) })
            return;
        }

        if (getSesConFile) {
            var IDs = getSesConFile
            var files = prop.get(`files_` + IDs + chatID)
            if (!files) { prop.read(`session_convertFileNames_` + chatID); return }
            var pros = await ctx.reply(`⏳ Memproses...`)
            var text = ctx.message.text
            if (text.length < 1 || text.length > variables.maxCusFile) return await bot.telegram.editMessageText(chatID, pros.message_id, null, `⚠️ Jumlah karakter pada nama file harus rentang dari 1 - ${variables.maxCusFile} karakter.`)
            var ops = prop.get(`selection_` + IDs + chatID)

            var pesan = `❇️ <b>Tentu!</b>\nMasukkan nama kustom yang Anda inginkan.`
            keyb[0] = [
                btn.text(`Lewati ⏩`, `convert_${ops}_${IDs}`)
            ]
            keyb[1] = [
                btn.text(`❌ Batal`, `cancel_`)
            ]

            prop.set(`custom_file_` + IDs + chatID, text)
            prop.read(`session_convertFileNames_` + chatID)
            prop.set(`skipCustomName_` + IDs + chatID, true)
            prop.set(`session_convertCustomName_` + chatID, IDs)
            await bot.telegram.editMessageText(chatID, pros.message_id, null, pesan, { parse_mode: 'HTML', reply_markup: markup.inlineKeyboard(keyb) })
            return;
        }

        if (getSesConCus) {
            try {
                var IDs = getSesConCus
                var files = prop.get(`files_` + IDs + chatID)
                if (!files) { prop.read(`session_convertCustomName_` + chatID); return }
                var pros = await ctx.reply(`⏳ Memproses...`)
                var text = ctx.message.text
                if (!text) return await bot.telegram.editMessageText(chatID, pros.message_id, null, `⚠️ Hanya mendukung format teks.`)
                var ops = prop.get(`selection_` + IDs + chatID)

                var doc = files.split(',')
                var fileLink = (await bot.telegram.getFileLink(doc[0])).href
                var filePath = path.join(__dirname, 'downloads', doc[1]);
                fs.ensureDirSync(path.dirname(filePath));

                var response = await axios.get(fileLink, { responseType: 'arraybuffer' });
                await fs.writeFile(filePath, response.data);
                var outputFilePath;
                var getMaxContacts = prop.get(`max_contacts_` + IDs + chatID)
                var maxContacts = getMaxContacts ? Number(getMaxContacts) : variables.maxCon

                if (ops == `csvToVcf`) {
                    outputFilePath = filePath.replace('.csv', '.vcf');
                    var extensi = `VCF`
                    var fileConverted = await helper.convertCSVtoVCF(filePath, outputFilePath, maxContacts, prop, chatID, IDs, text);
                }

                if (ops == `txtToVcf`) {
                    outputFilePath = filePath.replace('.txt', '.vcf');
                    var extensi = `VCF`
                    var fileConverted = await helper.convertTXTtoVCF(filePath, outputFilePath, maxContacts, prop, chatID, IDs, text);
                }

                if (ops == `vcfToCsv`) {
                    outputFilePath = filePath.replace('.vcf', '.csv');
                    var extensi = `CSV`
                    var fileConverted = await helper.convertVCFtoCSV(filePath, outputFilePath);
                }

                if (ops == `xlsxToVcf`) {
                    outputFilePath = filePath.replace('.xlsx', '.vcf');
                    var extensi = `VCF`
                    var fileConverted = await helper.convertXLSXtoVCF(filePath, outputFilePath, maxContacts, prop, chatID, IDs, text);
                }

                var fileLength = fileConverted.length
                var count = 0
                if (fileLength == 1) {
                    var caps = `✅ <b>Well Done!</b>\nBerhasil mengkonversi ${doc[1]} ke ${extensi}.`
                } else {
                    var caps = `✅ <b>Well Done!</b>\nBerhasil mengkonversi semua file ke ${extensi}.`
                }

                await fs.remove(filePath);
                for (const file of fileConverted) {
                    count++;
                    if (fileLength == 1) {
                        await ctx.replyWithDocument({ source: file }, { caption: caps, parse_mode: 'HTML' });
                    } else {
                        if (count == fileLength) {
                            await ctx.replyWithDocument({ source: file }, { caption: caps, parse_mode: 'HTML' });
                        } else {
                            await ctx.replyWithDocument({ source: file }, { parse_mode: 'HTML' });
                        }
                    }
                    await fs.remove(file)
                }
                try { await ctx.deleteMessage(pros.message_id) } catch { }
                prop.read(`skipMaxContacts_` + chatID)
                prop.read(`skipFileNames_` + chatID)
                prop.read(`skipCustomName_` + chatID)
            } catch (e) {
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
    } catch { }
})

module.exports = { bot, prop }