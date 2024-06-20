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
            
            try {
                var files = prop.get(`files_` + IDs + chatID)
                if (!files) return await ctx.answerCbQuery(`⚠️ Tombol kadaluarsa.`, { show_alert: true })

                var pros = await ctx.editMessageText(`⏳ Memproses...`)
                var doc = files.split(',')
                var fileLink = (await bot.telegram.getFileLink(doc[0])).href
                var filePath = path.join(__dirname, 'downloads', doc[1]);
                fs.ensureDirSync(path.dirname(filePath));

                var response = await axios.get(fileLink, { responseType: 'arraybuffer' });
                await fs.writeFile(filePath, response.data);
                var outputFilePath;
                var mimeType = doc[2].toLowerCase()

                if (type == 'csvToVcf') {
                    if (!mimeType.includes(`csv`)) { var r = false; var act = `CSV ke VCF` } else { var r = true }
                } else if (type == 'txtToVcf') {
                    if (!mimeType.includes(`plain`)) { var r = false; var act = `TXT ke VCF` } else { var r = true }
                } else if (type == 'vcfToCsv') {
                    if (!mimeType.includes(`x-vcard`)) { var r = false; var act = `VCF ke CSV` } else { var r = true }
                } else if (type == 'xlsxToVcf') {
                    if (!mimeType.includes(`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)) { var r = false; var act = `XLSX ke VCF` } else { var r = true }
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

                if (type == `csvToVcf`) {
                    outputFilePath = filePath.replace('.csv', '.vcf');
                    var extensi = `VCF`
                    await helper.convertCSVtoVCF(filePath, outputFilePath, 100);
                }

                if (type == `txtToVcf`) {
                    outputFilePath = filePath.replace('.txt', '.vcf');
                    var extensi = `VCF`
                    await helper.convertTXTtoVCF(filePath, outputFilePath, 100);
                }

                if (type == `vcfToCsv`) {
                    outputFilePath = filePath.replace('.vcf', '.csv');
                    var extensi = `CSV`
                    await helper.convertVCFtoCSV(filePath, outputFilePath, 100);
                }

                if (type == `xlsxToVcf`) {
                    outputFilePath = filePath.replace('.xlsx', '.vcf');
                    var extensi = `VCF`
                    await helper.convertXLSXtoVCF(filePath, outputFilePath, 100);
                }

                await ctx.replyWithDocument({ source: outputFilePath }, { caption: `✅ <b>Well Done!</b>\nBerhasil mengkonversi ${doc[1]} ke ${extensi}.`, parse_mode: 'HTML' });
                try { await ctx.deleteMessage(pros.message_id) } catch { }
                /*await fs.remove(filePath);
                if (outputFilePath) {
                    await fs.remove(outputFilePath);
                }*/
            } catch(e) {
                console.log(e)
                var pesan = `❌ <b>Error!</b>\n${e.message}`
                keyb[0] = [
                    btn.text(`🔄 Ulangi`, `conver_start`)
                ]

                prop.read(`session_convert_` + chatID)
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