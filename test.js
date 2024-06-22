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

efreofofi()