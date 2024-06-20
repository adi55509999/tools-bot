const { Telegraf } = require('telegraf')
const variables = require('./variables.js')
const helper = require('./components/helper/helper.js')
const { markup, btn } = require('./components/keyboard/inline.js')
const prop = require('./components/property/properties.js')

const bot = new Telegraf(variables.token)

bot.on(`message`, async ctx => {
    var chatID = ctx.chat.id
    var keyb = []
    if (variables.userList.indexOf(chatID) == -1 ) return await ctx.replyWithHTML(`⚠️ This bot is not for you.`)

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
    
        return await ctx.replyWithHTML(pesan, { reply_markup: markup.inlineKeyboard(keyb) })
    }

    var pola = /^\/convert$/i
    if (pola.exec(ctx.message.text)) {
        var pesan = `❇️ Kirimkan saya dokumen yang ingin Anda konversikan.`
        keyb[0] = [
            btn.text(`❌ Batal`, `cancel_`)
        ]

        await ctx.replyWithHTML(pesan, { reply_markup: markup.inlineKeyboard(keyb) })
        prop.set(`session_convert_` + chatID, true)
        return;
    }

    // SESSION
    var getSesCon = prop.get(`session_convert_` + chatID)

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

        console.log(doc.mime_type)
        prop.set(`files_` + IDs + chatID, `${doc.file_id},${doc.file_name},${doc.mime_type}`)
        prop.read(`session_convert_` + chatID)
        await bot.telegram.editMessageText(chatID, pros.message_id, null, pesan, { parse_mode: 'HTML', reply_markup: markup.inlineKeyboard(keyb) })
        return;
    }
})

module.exports = { bot, prop }