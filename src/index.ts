import { defaults } from 'lodash';
import * as assert from 'assert';
const createHash = require('webpack/lib/util/createHash');
import defaultConfig from './libs/default-config';
import loaderTemplate from './libs/loader-template';
import { getFileName, getCDNPath, getChunkPath, getVersions } from './libs/util';

class WebpackExternalPlugin {
  constructor(options = {}) {
    this.options = defaults(options, defaultConfig);
    this.chunks = {};
  }

  getCDNUrl(name, version) {
    return getCDNPath(this.options.cdnPath, { name, version });
  };

  getPublicUrl(file, compilation) {
    let publicPath = compilation.mainTemplate.getPublicPath({ hash: compilation.hash }) || '';

    if (publicPath && publicPath.substr(-1) !== '/') {
      publicPath += '/';
    }

    return getChunkPath(publicPath, { name: file, showHash: this.options.hash, hash: compilation.hash });
  }

  createChunk(names, id, compilation) {
    const name = names[0];

    const { outputOptions } = compilation;
    const { hashFunction, hashDigest, hashSalt } = outputOptions;

    const chunk = compilation.addChunk(name);
    chunk.names = names;
    chunk.id = -(id + 1);
    chunk.ids = [chunk.id];

    const modules = this.chunks[name];
    const source = loaderTemplate([...modules, ...(this.options.externals || [])]);

    const chunkHash = createHash(hashFunction);
    if (hashSalt) {
      chunkHash.update(hashSalt);
    }

    chunk.updateHash(chunkHash);

    chunkHash.update(source);

    chunk.hash = chunkHash.digest(hashDigest);

    const fileName = getFileName(this.options.filename, {
      name,
      id: chunk.id,
      hash: chunk.hash,
    });
    chunk.files = [fileName];

    compilation.assets[fileName] = {
      source: () => source,
      size: () => source.length,
    };

    return chunk;
  }

  apply(compiler) {
    compiler.hooks.afterCompile.tapPromise('WebpackExternal', async (compilation) => {
      const chunks = compilation.getStats().toJson({ chunks: true }).chunks;

      if (!chunks.length) {
        return;
      }

      if (!this.versions) {
        this.versions = await getVersions();
      }

      chunks.forEach((chunk) => {
        const { names = [], modules = [], files = [], id } = chunk;
        if (!names.length) {
          return;
        }

        const name = names[0];

        if (name === 'mini-css-extract-plugin') {
          return;
        }

        const sortedModules = [];

        modules.forEach((module) => {
          if (module.name.startsWith('external')) {
            const userRequest = module.reasons[0].userRequest;

            const version = this.versions[userRequest];

            assert(version, `cannot resolve version of: ${userRequest}, please install first`);

            sortedModules.push(this.getCDNUrl(userRequest, version));
          }
        });
        files.filter(file => !file.match(/\.map$/)).forEach((file) => {
          sortedModules.push(this.getPublicUrl(file, compilation));
        });

        this.chunks[name] = sortedModules;
        chunk.names = [];
        chunks.push(this.createChunk(names, id, compilation));
      });
    });
  }
}

module.exports = WebpackExternalPlugin;
