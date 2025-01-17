import { existsSync, readFileSync, unlink } from 'node:fs';
import { Readable } from 'node:stream';
import { type Result, ok } from '@dragee-io/type/common';
import { Parser, type ReadEntry } from 'tar';
import {
    downloadProjectAndGetName,
    removeVersionAndExtension
} from './services/project.service.ts';
import { $ } from 'bun';

export const install = async <T>(
    projectsRegistryUrl: string,
    localRegistryPath: string,
    projectName: string
): Promise<Result<T>> => {
    // Download
    const projectFileName = await downloadProjectAndGetName(
        projectsRegistryUrl,
        localRegistryPath,
        projectName
    );
    const destinationDirectoryName = `${localRegistryPath}/${removeVersionAndExtension(projectFileName)}`;

    // Extraction & file writing
    const files: ExtractedFile[] = await decompress(
        readFileSync(`${destinationDirectoryName}/${projectFileName}`)
    );
    for (const file of files) {
        const filePath = file.path.replace('package/', '');
        await Bun.write(`${destinationDirectoryName}/${filePath}`, file.content);
    }

    // Install dependancies with Bun shell
    if (!existsSync(`${localRegistryPath}/${projectName}/node_modules`)) {
        await $`cd ${localRegistryPath}/${projectName}/; bun install`;
        console.log(`Project ${projectName} has been installed`);
    }

    // Import
    const project = (await import(destinationDirectoryName)).default as T;

    // Delete targz
    unlink(`${destinationDirectoryName}/${projectFileName}`, err => {
        if (err) throw err;
        console.log(`${projectFileName} was deleted`);
    });

    return ok(project);
};

type ExtractedFile = {
    path: string;
    content: Buffer;
};

export const decompress = (arrayBuffer: Buffer): Promise<ExtractedFile[]> =>
    new Promise((resolve, reject) => {
        const buffer = Buffer.from(arrayBuffer);
        const parseStream = new Parser();
        const files: ExtractedFile[] = [];

        parseStream
            .on('entry', (entry: ReadEntry) => {
                const chunks: Buffer[] = [];
                entry.on('data', (chunk: Buffer) => chunks.push(chunk));
                entry.on('end', () => {
                    const content = Buffer.concat(chunks);
                    files.push({ path: entry.path, content });
                });
            })
            .on('end', () => {
                resolve(files);
            })
            .on('error', (error: Error) => {
                reject(error);
            });

        const bufferStream = new Readable();
        bufferStream.pipe(parseStream);
        bufferStream.push(buffer);
        bufferStream.push(null);
    });
