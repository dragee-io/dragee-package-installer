import { $, Glob } from 'bun';
import { type Maybe, type Nullable, none, some } from './fp/maybe.model.ts';
import type { Result } from './fp/result.model.ts';
import { install } from './install-namespace-project.ts';

const findProjectLocally = async <T>(
    localRegistryPath: string,
    projectName: string
): Promise<Maybe<T>> => {
    const fileName = await findProjectIndex(localRegistryPath, projectName);
    if (!fileName) return none();
    try {
        // Install dependancies with Bun shell
        await $`cd ${localRegistryPath}/${projectName}/; bun install`;

        // Import default
        const project = require(fileName).default as NonNullable<T>;
        return some(project);
    } catch (error) {
        console.log('Local project Error', error);
        return none();
    }
};

const findProjectIndex = async (localRegistryPath: string, projectName: string) => {
    const glob = new Glob('index.ts');
    const scan = glob.scan({
        cwd: `${localRegistryPath}/${projectName}/`,
        absolute: true,
        onlyFiles: true
    });
    try {
        const result = await scan.next();
        if (result?.value === undefined) return null;
        console.log(`${projectName} found`);
        return result.value;
    } catch (error) {
        console.log(`${projectName} not found`);
        return null;
    }
};

const installFor = async <T>(
    projectsRegistryUrl: string,
    localRegistryPath: string,
    projectName: string
): Promise<Nullable<T>> => {
    const result: Result<T> = await install(projectsRegistryUrl, localRegistryPath, projectName);
    if (result.status !== 'ok') {
        console.log(`Failed to download project for namespace: ${projectName}`);
        return null;
    }

    return result.content;
};

export const lookupForProjects = async <T>(
    projectsRegistryUrl: string,
    localRegistryPath: string,
    projectNames: string[]
): Promise<T[]> => {
    console.log('Looking up for projects');

    const projects: T[] = [];

    for (const projectName of projectNames) {
        const foundLocally = await findProjectLocally(localRegistryPath, projectName);
        const project = await foundLocally.orElse(() =>
            installFor(projectsRegistryUrl, localRegistryPath, projectName)
        );
        if (project) projects.push(project as NonNullable<T>);
    }

    console.log('List of projects matching dragees');
    console.table(projects, ['projectName', 'fileName']);

    return projects;
};