import { describe, expect, spyOn, test } from 'bun:test';
import { rmdirSync, unlinkSync } from 'node:fs';
import axios from 'axios';
import * as project from '../src/services/project.service.ts';
import {
    controlPackageIntegrity,
    downloadProjectAndGetName,
    generateChecksumFile,
    removeVersionAndExtension
} from '../src/services/project.service.ts';

describe('Should remove version and extension from project name', () => {
    test('with empty string', async () => {
        const projectName = '';
        const result = removeVersionAndExtension(projectName);
        expect(result).toBeEmpty();
    });

    test('with project name', async () => {
        const projectName = 'ddd-asserter-0.0.2-latest.tgz';
        const result = removeVersionAndExtension(projectName);
        expect(result).toBe('ddd-asserter');
    });
});

describe('Should generate checksum file', () => {
    test('with test file and sha512', async () => {
        const fileName = './test/approval/test-file-checksum.txt';
        const algorithm = 'sha512';
        const result = generateChecksumFile(fileName, algorithm);
        expect(result).toBe(
            'sVAC2mwmIInQiUpg6RA9w/WijIpmL2ZttHG5bsOxB09c/iDdC/S2M0QvSLAa+fsxTJqnTTgcrJnFRoDv+PEbow=='
        );
    });

    test('with test file and sha1', async () => {
        const fileName = './test/approval/test-file-checksum.txt';
        const algorithm = 'sha1';
        const result = generateChecksumFile(fileName, algorithm);
        expect(result).toBe('Tomopt5LF4aOs2jXjv0HOAll9+c=');
    });
});

describe('Should control file integrity', () => {
    test('with correct file', async () => {
        const fileName = './test/approval/test-file-checksum.txt';
        const downloadDataIntegrity =
            'sha512-sVAC2mwmIInQiUpg6RA9w/WijIpmL2ZttHG5bsOxB09c/iDdC/S2M0QvSLAa+fsxTJqnTTgcrJnFRoDv+PEbow==';
        const projectName = 'test-project';
        expect(() =>
            controlPackageIntegrity(downloadDataIntegrity, fileName, projectName)
        ).not.toThrowError();
    });

    test('with incorrect file', async () => {
        const fileName = './test/approval/test-file-checksum.txt';
        const downloadDataIntegrity = 'sha512-AZERTYUIOP';
        const projectName = 'test-project';
        expect(() =>
            controlPackageIntegrity(downloadDataIntegrity, fileName, projectName)
        ).toThrowError('Could not verify test-project package integrity');
    });
});

describe('Should download file and get name', () => {
    test('with with correct download', async () => {
        const projectsRegistryUrl = 'registry';
        const projectsDirectory = 'test/generated/';
        const projectName = 'testProject.txt';

        // Mocking first axios get call
        const getMock = spyOn(axios, 'get');
        const dataTarball = {
            status: 200,
            data: {
                dist: {
                    tarball: `https://localhost:8080/${projectsRegistryUrl}/${projectName}`
                }
            }
        };
        // @ts-ignore
        getMock.mockImplementationOnce(() => Promise.resolve(dataTarball));

        // Mocking second axios get call
        const dataDownload = {
            status: 200,
            data: 'text'
        };
        // @ts-ignore
        getMock.mockImplementationOnce(() => Promise.resolve(dataDownload));

        // Mocking controlPackageIntegrity
        const getControlPackageIntegrityMock = spyOn(project, 'controlPackageIntegrity');
        getControlPackageIntegrityMock.mockImplementation(() => null);

        // Test
        const fileName = await downloadProjectAndGetName(
            projectsRegistryUrl,
            projectsDirectory,
            projectName
        );

        // Expect correct file name return
        expect(fileName).not.toBeNull();
        expect(fileName).toBe(projectName);

        // Expect read written file
        expect(await Bun.file(`${import.meta.dir}/generated/testProject.txt`).exists()).toBeTrue();
        unlinkSync(`${import.meta.dir}/generated/testProject.txt`);
        rmdirSync(`${import.meta.dir}/generated`);

        // Restoring mocks
        getMock.mockRestore();
        getControlPackageIntegrityMock.mockRestore();
    });

    test('with with incorrect download', () => {
        const errorMsg = 'ERROR';
        const getMock = spyOn(axios, 'get');
        getMock.mockImplementation(() => Promise.reject(Error(errorMsg)));

        const projectsRegistryUrl = 'registry';
        const projectsDirectory = 'dir';
        const projectName = 'name';
        expect(() =>
            downloadProjectAndGetName(projectsRegistryUrl, projectsDirectory, projectName)
        ).toThrowError(
            `Could not download ${projectName} at url ${projectsRegistryUrl}/${projectName}/latest: Error: ${errorMsg}`
        );

        // Restoring mocks
        getMock.mockRestore();
    });
});
