import * as ReadPackageTree from 'read-package-tree';

const REGEXP_HASH = /\[hash(?::(\d+))?]/gi;
const REGEXP_NAME = /\[name]/gi;
const REGEXP_ID = /\[id]/gi;
const REGEXP_PACKAGE = /\[package]/gi;
const REGEXP_VERSION = /\[version]/gi;

const withHashLength = (replacer, handlerFn?) => {
  return (match, hashLength, ...args) => {
    const length = hashLength && parseInt(hashLength, 10);
    if (length && handlerFn) {
      return handlerFn(length);
    }
    const hash = replacer(match, hashLength, ...args);
    return length ? hash.slice(0, length) : hash;
  };
};

const getReplacer = (value, allowEmpty?) => {
  return (match, ...args) => {
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

let versions = null;
let versionPromise = null;

export const getVersions = () => {
  if (versions) {
    return versions;
  }
  if (versionPromise) {
    return versionPromise;
  }
  versionPromise = new Promise((rec, rej) => {
    ReadPackageTree(cwd, (err, data) => {
      if (err) {
        rej(err);
        return;
      }
      versions = recursivePackage(data);

      rec(versions);
    });
  });
  return versionPromise;
};

// webpack/lib/TemplatedPathPlugin.js#93
export const getFileName = (path, { name, hash, id } = {}) => {
  return path
    .replace(REGEXP_HASH, withHashLength(getReplacer(hash)))
    .replace(REGEXP_ID, getReplacer(id))
    .replace(REGEXP_NAME, getReplacer(name));
};

export const getCDNPath = (path, { name, version }) => {
  return typeof path === 'function' ? path(name, version) : (
    path
      .replace(REGEXP_PACKAGE, getReplacer(name))
      .replace(REGEXP_VERSION, getReplacer(version))
  );
};

export const getChunkPath = (publicPath, { name, showHash, hash }) => {
  return `${publicPath}${name}${showHash ? `?${hash}` : ''}`;
};
