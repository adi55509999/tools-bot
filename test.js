const helper = require('./components/helper/helper.js')
const fs = require('fs-extra')

function efreofofi() {
    var data = ['a', 'b']
    var c = 0

    for (var b of data) {
        c++;
        console.log(b)
        if (c == data.length) {
            console.log('OK')
        }
    }
}

function fohuefohef() {
    var n = Number('28282828')
    console.log(n)
    console.log(isNaN(n))
    if (isNaN(n)) { console.log(`OK`) } else { console.log(`NO`) }
}

function heifhee() {
    var con = fs.readFileSync('./downloads/contact.vcf', 'utf-8')
    console.log(con)
    helper.splitVCF(con, 2)
}

heifhee()