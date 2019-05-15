function showLoading(text) {
    loading.style.display = 'block';
    info.style.display = 'block';
    info.style.color = "#000000";
    info.textContent = text;
    upload.disabled = true;
}

function hideLoading(text) {
    loading.style.display = 'none';
    info.style.display = 'none';
    if (text) {
        info.textContent = text;
        info.style.color = "#ff0000";
    } else {
        info.textContent = '';
    }

    upload.disabled = false;
}

async function getRequest(url) {
    console.log('get:' + url);
    let response = await fetch('https://api.github.com' + url, {
        headers: new Headers({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Authorization': 'token ' + token.value
        })
    });

    let json = await response.json();
    console.log(json);
    return json;
}

async function post(url, method, data) {
    console.log(method + ':' + url);
    let response = await fetch('https://api.github.com' + url, {
        method: method,
        body: JSON.stringify(data),
        headers: new Headers({
            'Authorization': 'token ' + token.value
        })
    });
    let json = await response.json();
    console.log(json);
    return json;
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