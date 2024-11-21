import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { decompress } from '../src/install-namespace-project.ts';

describe('Should decompress', () => {
    test('decompress tar.gz OK', async () => {
        const files = await decompress(readFileSync(`${import.meta.dir}/approval/test.tar.gz`));

        expect(files).not.toBeNull();
        expect(files).toBeArrayOfSize(1);
        expect(files[0]).toMatchObject({
            path: 'test.txt',
            content: Buffer.from('test')
        });
    });
});
