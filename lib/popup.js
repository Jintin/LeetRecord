let upload = document.getElementById('upload');
let generate = document.getElementById('generate');
let repoList = document.getElementById('repos');
let token = document.getElementById('token');
let tokenButton = document.getElementById('save');
let create = document.getElementById('create');
let info = document.getElementById('info');
let loading = document.getElementById('loading');
hideLoading();
var currentRepo = '';

upload.onclick = function() {
    showLoading('Uploading');
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {

        }, function(response) {
            if (response) {
                updateSolution(response);
            } else {
                hideLoading();
            }
        })
    });
}

generate.onclick = function() {
    chrome.tabs.create({
        active: true,
        url: 'https://github.com/settings/tokens/new?scopes=repo&description=LeetRecord'
    });
}

tokenButton.onclick = function() {
    chrome.storage.sync.set({
        'token': token.value
    });
    getRepos();
}

create.onclick = function() {
    createRepo();
}

chrome.storage.sync.get(['token'], function(items) {
    if (items['token']) {
        token.value = items['token'];
        getRepos();
    }
});

repoList.onchange = function() {
    currentRepo = repoList.value;
    chrome.storage.sync.set({
        'repo': currentRepo
    });
}

function showLoading(text) {
    loading.style.display = 'block';
    info.style.display = 'block';
    info.textContent = text;
    upload.disabled = true;
}

function hideLoading() {
    loading.style.display = 'none';
    info.style.display = 'none';
    info.textContent = '';
    upload.disabled = false;
}

function updateSolution(response) {
    var file = response.title + getExtension(response.lang);
    var path = '/repos/' + currentRepo + '/contents/solutions/' + file;
    var content = response.content;
    updateContent(path, {
        message: response.speed,
        content: encode(content)
    }, function(result) {
        updateReadme(response, file);
    })
}

function updateReadme(response, file) {
    showLoading('Update README');
    var path = '/repos/' + currentRepo + '/contents/README.md';
    get(path, function(result) {
        var content;
        var data = {
            message: 'update record'
        }
        if (result) {
            var obj = JSON.parse(result);
            content = decode(obj['content']);
            data.sha = obj['sha'];
        }
        var readme = generateREADME({
            content: content,
            url: response.url,
            title: response.title,
            lang: response.lang,
            speed: response.speed,
            file: file
        });
        data.content = encode(readme);
        if (content == readme) {
            console.log('same data');
            hideLoading();
            return;
        }
        post(path, 'PUT', data, function(result) {
            hideLoading();
        });
    });
}

function generateREADME(data) {
    if (!data.content) {
        data.content =
            '# Leetcode\n' +
            '\n' +
            '| # | Title | Solution | Runtime |\n' +
            '|---| ----- | -------- | ------- |\n';
    }
    var list = data.content.split('\n');
    var record = data.title.split('.');
    var number = parseInt(record[0], 10);
    var desc = genDesc(number, record[1], data);
    for (var i = 4; i < list.length; i++) { //TODO binary search
        var line = list[i].substring(1);
        var current = parseInt(line.substring(0, line.indexOf('|')), 10);
        if (current == number) {
            return data.content.replace(list[i] + '\n', desc); //TODO add multi-lang
        } else if (current > number) {
            return insertString(data.content, list[i], desc);
        }
    }
    return data.content + desc;
}

function insertString(source, target, obj) {
    var index = source.indexOf(target);
    return [source.slice(0, index), obj, source.slice(index)].join('');
}

function genDesc(number, title, data) {
    // | # | Title | Solution | Runtime |
    return '|' + number + '|' +
        '[' + title + ']' + '(' + data.url + ')|' +
        '[' + data.lang + '](./solutions/' + encodeURIComponent(data.file) + ')|' +
        data.speed + '|\n';
}

function getRepos() {
    showLoading('Get Repo');
    get('/user/repos?affiliation=owner', function(result) {
        hideLoading();
        if (result) {
            while (repoList.options.length > 1) {
                repoList.removeChild(repoList.lastChild);
            }
            repoList.selectedIndex = 0;
            var list = JSON.parse(result);
            for (var i = 0; i < list.length; i++) {
                var repo = list[i];
                var opt = document.createElement('option');
                opt.appendChild(document.createTextNode(repo.full_name));
                opt.value = repo.full_name;
                repoList.appendChild(opt);
                if (repo.name == 'leetcode') {
                    create.disabled = true;
                }
            }
            chrome.storage.sync.get(['repo'], function(items) {
                if (validRepo(items['repo'])) {
                    currentRepo = items['repo'];
                    repoList.value = currentRepo;
                }
            });
        }
    });
}

function validRepo(repo) {
    for (var i = 0; i < repoList.length; i++) {
        if (repo == repoList[i].text) {
            return true;
        }
    }
    return false;
}

function createRepo() {
    var name = 'leetcode';
    post('/user/repos', 'POST', {
        name: name,
        private: true
    }, function(result) {
        if (result) {
            var obj = JSON.parse(result);
            chrome.storage.sync.set({
                'repo': obj['full_name']
            }, function(result) {
                getRepos();
            });
        }
    });
}

function updateContent(path, data, callback) {
    get(path, function(result) {
        if (result) {
            var obj = JSON.parse(result);
            data.sha = obj['sha'];
            if (data.content == obj['content'].split('\n').join('')) {
                console.log('same data');
                callback(null);
                return;
            }
        }
        post(path, 'PUT', data, callback);
    });
}

function getExtension(lang) {
    switch (lang) {
        case 'Java':
            return '.java';
        case 'Python', 'Python3':
            return '.py';
        case 'Ruby':
            return '.rb'
        case 'Go':
            return '.go';
        case 'Swift':
            return '.swift'
        default:
            return lang;
    }
}

function get(url, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://api.github.com' + url);
    xhr.setRequestHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    xhr.setRequestHeader('Authorization', 'token ' + token.value);
    xhr.send();
    xhr.onreadystatechange = function() {
        result(xhr, callback);
    }
}

function post(url, method, params, callback) {
    const xhr = new XMLHttpRequest();
    xhr.open(method, 'https://api.github.com' + url);
    xhr.setRequestHeader('Authorization', 'token ' + token.value);
    xhr.send(JSON.stringify(params));
    xhr.onreadystatechange = function() {
        result(xhr, callback);
    }
}

function result(xhr, callback) {
    if (xhr.readyState == 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
            callback(xhr.responseText);
        } else {
            callback(null);
        }
    }
}

function encode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
        }));
}

function decode(str) {
    return decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}