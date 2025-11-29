# ClelandLab Grapher

This is an open-source component of LabWeb

## Get Started

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

Now the frontend files will be generated in `web/build` folder. You can use whatever static file server to serve these files, like Nginx. Make sure to config the route such that `/srpc` goes to the backend server. For example, to put both frontend and backend in the route `/G/` in Nginx config:

```
location /G/srpc {
    proxy_pass http://localhost:11112/;
}

location /G/ {
    alias  /opt/grapher/web/build/;
    index  index.html;
}
```

