let upload = document.getElementById('upload');
let generate = document.getElementById('generate');
let repoList = document.getElementById('repos');
let token = document.getElementById('token');
let tokenButton = document.getElementById('save');
let create = document.getElementById('create');

var currentRepo = "";

upload.onclick = function() {
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {

        }, function(response) {
            updateSolution(response);
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
    token.value = items['token'];
    getRepos();
});

repoList.onchange = function() {
    currentRepo = repoList.value;
    chrome.storage.sync.set({
        'repo': currentRepo
    });
}

function updateSolution(response) {
    var file = response.title + getExtension(response.lang);
    var path = '/repos/' + currentRepo + '/contents/solutions/' + file;
    var content = response.content;
    updateContent(path, {
        message: response.speed,
        content: btoa(content)
    }, function(result) {
        console.log('update solution:');
        console.log(result);
        updateReadme(response, file);
    })
}

function updateReadme(response, file) {
    var path = '/repos/' + currentRepo + '/contents/README.md';
    get(path, function(result) {
        var content;
        var data = {
            message: 'update record'
        }
        if (result) {
            var obj = JSON.parse(result);
            content = atob(obj['content']);
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
        console.log('readme:');
        console.log(readme);
        data.content = btoa(readme);
        post(path, 'PUT', data, function(result) {
            console.log('update readme:');
            console.log(result);
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
    get('/user/repos?affiliation=owner', function(result) {
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
            console.log('status:' + xhr.status);
            callback(null);
        }
    }
}