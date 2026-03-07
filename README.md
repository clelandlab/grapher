# ClelandLab Grapher

This is an open-source component of LabWeb

<img width="1896" height="905" alt="image" src="https://github.com/user-attachments/assets/45b8e676-2dee-4b71-ad7e-938eaed53037" />

> The grapher does not have the capability to actually delete any file. The trash is only a tag to hide it from the list.

## Keyboard Shortcuts

On the data list:
- `s`: star the current data
- `t`: trash the current data
- `ctrl + up`: previous data
- `ctrl + down`: next data

## Deployment

It requires some web knowledge to config everything properly. But with AI's help, you should be able to get it done quickly.

### 0. Prerequisites

You need Node.js installed on your system. You can download it from [nodejs.org](https://nodejs.org/).

### 1. Config

create a `config.js` file in the root directory with the following content:

```javascript
export default {
  port: 11112, // backend server port
  dataPrefix: 'V:/path/prefix', // for permission control
  tokenPath: '.',
  // if you want to map between user-input path and data-storage path, use the following line
  pathMap: path => path.replaceAll('\\', '/').replace(/^V:/, '/mnt/V')
}
```

### 2. Start Backend

To just run the backend server, use the following command:

```
node .
```

However, you may want to use the [`pm2`](https://pm2.keymetrics.io/docs/usage/quick-start/) process manager to keep the server running in the background.

```
pm2 start . --name grapher
```

**When the backend starts, a token will be generated in the `tokenPath` specified in the config file. You will need this token to access the Grapher frontend.**

### 3. Build Frontend

```
cd web

# install dependencies
npm install

# build the frontend
npm run build
```

Now the frontend files will be generated in `web/build` folder.

### 4. Web Server

You can use whatever web server to serve the static website and reverse proxy the backend, like Nginx or Caddy. Make sure to config the route such that `/srpc` goes to the backend server.

For example, in [Nginx](https://nginx.org/) config, put both frontend and backend in the route `/G/`:

```
# part of nginx.conf
location /G/srpc {
    proxy_pass http://localhost:11112/;
}
location /G/ {
    alias  /path/to/grapher/web/build/;
    index  index.html;
}
```

Or if you want to use [Caddy](https://caddyserver.com/) and directly serve on port 80:

```
# Caddyfile
:80 {
    root * C:\path\to\grapher\web\build
    file_server
    reverse_proxy /srpc* localhost:11112
}
```

I am sure you can use AI to get the web server config done or customize the config quickly.

## Protocol

The Frontend and Backend communicate via [SRPC](https://github.com/yzITI/srpc). The interfaces are:

```js
srpc.grapher.auth(token)
srpc.grapher.getList(token, path)
srpc.grapher.writeYML(token, path, data)
srpc.grapher.get(token, path, meta = true, lastSize = 0)
srpc.grapher.createDir(token, path, dirName)
```

