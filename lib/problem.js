chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        var data = {
            url: extractUrl(),
            title: extractTitle(),
            content: extractCode(),
            speed: extractSpeed(),
            lang: extractLang()
        };
        sendResponse(data);
        return true;
    });

function extractUrl() {
    var base = 'https://leetcode.com/problems/';
    var url = window.location.href;
    var end = url.substring(base.length).indexOf('/') + 1 + base.length;
    url = url.substring(0, end);
    return url;
}

function extractTitle() {
    return document.querySelectorAll('div[data-cy="question-title"]')[0].innerText;
}

function extractLang() {
    return document.querySelectorAll('div[data-cy="lang-select"]')[0].innerText;
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
    // return document.getElementsByName("code")[0].value;
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
