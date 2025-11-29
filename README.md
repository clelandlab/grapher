# ClelandLab Grapher

This is an open-source component of LabWeb

## Config

create a `config.js` file in the root directory with the following content:

```javascript
export default {
  port: 11112,
  dataPrefix: 'V:/path/prefix',
  tokenPath: '.',
  // if you want to map between user-input path and data-storage path, use the following line
  pathMap: path => path.replaceAll('\\', '/').replace(/^V:/, '/mnt/V')
}
```
