import { describe, expect, spyOn, test } from 'bun:test';
import { ko, none, ok, some } from '@dragee-io/type/common';
import * as installNamespaceProject from '../src/install-namespace-project.ts';
import { findProjectIndex, findProjectLocally, installFor } from '../src/project-lookup.ts';
import indexContent from '../test/approval/index.ts';

describe('Should find project index', () => {
    test('with empty strings', async () => {
        const localRegistryPath = '';
        const projectName = '';
        const projectIndex = await findProjectIndex(localRegistryPath, projectName);
        expect(projectIndex).toBeNull();
    });

    test('with not found parameters', async () => {
        const localRegistryPath = 'azerty';
        const projectName = 'qwerty';
        const projectIndex = await findProjectIndex(localRegistryPath, projectName);
        expect(projectIndex).toBeNull();
    });

    test('with correct parameters', async () => {
        const localRegistryPath = './test';
        const projectName = 'approval';
        const projectIndex = await findProjectIndex(localRegistryPath, projectName);
        console.log(projectIndex);
        expect(projectIndex).not.toBeNull();
        expect(projectIndex).toBeTypeOf('string');
        expect(projectIndex).toContain('test');
        expect(projectIndex).toContain('approval');
        expect(projectIndex).toContain('index.ts');
    });
});

describe('Should find project locally', () => {
    test('with empty strings', async () => {
        const localRegistryPath = '';
        const projectName = '';
        const projectMaybe = await findProjectLocally(localRegistryPath, projectName);
        expect(projectMaybe).not.toBeNull();
        expect(projectMaybe).toMatchObject(none());
    });

    test('with not found parameters', async () => {
        const localRegistryPath = 'azerty';
        const projectName = 'qwerty';
        const projectMaybe = await findProjectLocally(localRegistryPath, projectName);
        expect(projectMaybe).not.toBeNull();
        expect(projectMaybe).toMatchObject(none());
    });

    test('with correct parameters', async () => {
        const localRegistryPath = './test';
        const projectName = 'approval';
        const projectMaybe = await findProjectLocally(localRegistryPath, projectName);
        expect(projectMaybe).not.toBeNull();
        expect(projectMaybe).not.toMatchObject(none());
        expect(projectMaybe).toMatchObject(some(indexContent));
    });
});

describe('Should install for', () => {
    test('with install KO', async () => {
        // Mock install KO
        const installMock = spyOn(installNamespaceProject, 'install');
        installMock.mockResolvedValue(ko('error'));

        const project = await installFor('', '', '');
        expect(project).toBeNull();

        expect(installMock).toHaveBeenCalledTimes(1);
        installMock.mockRestore();
    });

    test('with install OK', async () => {
        // Mock install OK
        const installMock = spyOn(installNamespaceProject, 'install');
        installMock.mockResolvedValue(ok('ok project'));

        const project = await installFor('', '', '');
        expect(project).not.toBeNull();
        expect(project).toEqual('ok project');

        expect(installMock).toHaveBeenCalledTimes(1);
        installMock.mockRestore();
    });
});
