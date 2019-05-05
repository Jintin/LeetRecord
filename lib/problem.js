chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        var data = {
            url: window.location.href,
            title: extractTitle(),
            content: extractCode(),
            speed: extractSpeed(),
            lang: extractLang()
        };
        console.log(data);
        sendResponse(data);
        return true;
    });

function extractTitle() {
    return document.getElementById('question-title').innerText;
}

function extractLang() {
    return document.getElementById('lang-select').innerText;
}

function extractCode() {
    var code = document.getElementsByClassName('CodeMirror-code')[0];
    var list = code.innerText.split('\n');
    var text = '';
    for (var i = 1; i < list.length; i += 2) {
        text += list[i];
        text += '\n';
    }
    return text;
}

function extractSpeed() {
    var result = document.getElementsByClassName('ant-table-tbody')[0];
    if (result) {
        var speed = result.childNodes[0].childNodes[2].innerText;
        return speed;
    } else {
        return '';
    }
}