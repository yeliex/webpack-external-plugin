const ReadPackageTree = require('read-package-tree');

const REGEXP_HASH = /\[hash(?::(\d+))?\]/gi;
const REGEXP_NAME = /\[name\]/gi;
const REGEXP_ID = /\[id\]/gi;
const REGEXP_PACKAGE = /\[package\]/gi;
const REGEXP_VERSION = /\[version\]/gi;

const withHashLength = (replacer, handlerFn) => {
  const fn = (match, hashLength, ...args) => {
    const length = hashLength && parseInt(hashLength, 10);
    if (length && handlerFn) {
      return handlerFn(length);
    }
    const hash = replacer(match, hashLength, ...args);
    return length ? hash.slice(0, length) : hash;
  };
  return fn;
};

const getReplacer = (value, allowEmpty) => {
  const fn = (match, ...args) => {
    // last argument in replacer is the entire input string
    const input = args[args.length - 1];
    if (value === null || value === undefined) {
      if (!allowEmpty) {
        throw new Error(
          `Path variable ${match} not implemented in this context: ${input}`,
        );
      }
      return '';
    } else {
      return `${value}`;
    }
  };
  return fn;
};

const cwd = process.cwd();

const recursivePackage = ({ children = [] }, versions = {}) => {
  children.forEach((node) => {
    const { name, version } = node.package;
    if (versions[name]) {
      return;
    }
    versions[name] = version;
    if (node.children.length) {
      recursivePackage(node, versions);
    }
  });
  return versions;
};

exports.getVersions = () => {
  return new Promise((rec, rej) => {
    ReadPackageTree(cwd, (err, data) => {
      if (err) {
        rej(err);
        return;
      }
      rec(recursivePackage(data));
    });
  });
};

// webpack/lib/TemplatedPathPlugin.js#93
exports.getFileName = (path, { name, hash, id } = {}) => {
  return path
    .replace(REGEXP_HASH, withHashLength(getReplacer(hash)))
    .replace(REGEXP_ID, getReplacer(id))
    .replace(REGEXP_NAME, getReplacer(name));
};

exports.getCDNPath = (path, { name, version }) => {
  return typeof path === 'function' ? path(name, version) : (
    path
      .replace(REGEXP_PACKAGE, getReplacer(name))
      .replace(REGEXP_VERSION, getReplacer(version))
  );
};

exports.getChunkPath = (publicPath, { name, showHash, hash }) => {
  return `${publicPath}${name}${showHash ? `?${hash}` : ''}`;
};
