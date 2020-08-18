let upload = document.getElementById('upload');
let generate = document.getElementById('generate');
let repoList = document.getElementById('repos');
let tokenSection = document.getElementById('token_section');
let token = document.getElementById('token');
let tokenButton = document.getElementById('save');
let create = document.getElementById('create');
let info = document.getElementById('info');
let link = document.getElementById('link');
let loading = document.getElementById('loading');
hideLoading();
var currentRepo = '';

upload.onclick = function() {
  showLoading('Uploading...');
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {

    }, function(response) {
      if (response) {
        updateSolution(response);
      } else {
        console.log('error to get response');
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
  tokenSection.style.display = "none";
  getRepos();
}

create.onclick = function() {
  createRepo();
}

github_link.onclick = function() {
  chrome.tabs.create({
    active: true,
    url: 'https://github.com/' + currentRepo
  });
}
option_link.onclick = function() {
  if (tokenSection.style.display == "none") {
    tokenSection.style.display = "block";
  } else {
    tokenSection.style.display = "none";
  }
}

chrome.storage.sync.get(['token'], function(items) {
  if (items['token'] && items['token'].length > 0) {
    token.value = items['token'];
    getRepos();
    tokenSection.style.display = "none";
  } else {
    tokenSection.style.display = "block";
  }
});

repoList.onchange = function() {
  currentRepo = repoList.value;
  chrome.storage.sync.set({
    'repo': currentRepo
  });
}

function updateSolution(solution) {
  var file = solution.title + getExtension(solution.lang);
  var path = '/repos/' + currentRepo + '/contents/solutions/' + file;
  updateContent(path, {
    message: solution.speed,
    content: encode(solution.content)
  }, function() {
    setTimeout(function() {
      checkReadme(solution, file);
    }, 300);
  });

}

function checkReadme(response, file) {
  var path = '/repos/' + currentRepo + '/contents/README.md';
  getRequest(path)
    .then(result => {
      if (!result.sha) {
        result.sha = '';
      }
      if (!result.content) {
        result.content = '';
      }

      updateREADME(path, {
        content: decode(result.content),
        url: response.url,
        sha: result.sha,
        title: response.title,
        lang: response.lang,
        speed: response.speed,
        file: file
      });
    });
}

function updateREADME(path, source) {
  var readme = generateREADME(source);
  if (source.content == readme) {
    console.log('same data');
    hideLoading();
    return;
  }
  var data = {}
  data.message = source.title + ', ' + source.speed
  data.content = encode(readme);
  data.sha = source.sha;
  post(path, 'PUT', data)
    .then(hideLoading())
}

function generateREADME(data) {
  if (!data.content || !data.content.includes('| # | Title |')) {
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
  showLoading('Get Repo...');
  getRequest('/user/repos?affiliation=owner')
    .then(result => {
      while (repoList.options.length > 1) {
        repoList.removeChild(repoList.lastChild);
      }
      repoList.selectedIndex = 0;
      for (var i = 0; i < result.length; i++) {
        var repo = result[i];
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
      hideLoading();
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
  showLoading('Create repo...')
  var name = 'leetcode';
  post('/user/repos', 'POST', {
      name: name,
      private: true
    })
    .then(obj => {
      chrome.storage.sync.set({
        'repo': obj['full_name']
      }, function(result) {
        getRepos();
      });
    });
}

function updateContent(path, data, callback) {
  getRequest(path)
    .then(result => {
      if (result['sha']) {
        data.sha = result['sha'];
        if (data.content == result['content'].split('\n').join('')) {
          console.log('same data');
          callback();
          return;
        }
      }
      post(path, 'PUT', data)
        .then(callback());
    });
}

function getExtension(lang) {
  switch (lang) {
    case 'C++':
      return '.cpp';
    case 'C#':
      return '.cs';
    case 'JavaScript':
      return '.js';
    case 'Kotlin':
      return '.ks'
    case 'MySQL', 'MS SQL', 'Oracle':
      return '.sql';
    case 'Python', 'Python3':
      return '.py';
    case 'Ruby':
      return '.rb';
    case 'Rust':
      return '.rs';
    case 'TypeScript':
      return '.ts';
    default:
      return '.' + lang.toLowerCase();
  }
}
