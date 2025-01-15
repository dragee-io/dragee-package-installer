import { type Maybe, type Nullable, type Result, none, some } from '@dragee-io/type/common';
import { Glob } from 'bun';
import { install } from './install-namespace-project.ts';

export const findProjectLocally = async <T>(
    localRegistryPath: string,
    projectName: string
): Promise<Maybe<T>> => {
    try {
        const fileName = await findProjectIndex(localRegistryPath, projectName);
        if (!fileName) return none();

        // Import default
        const project = require(fileName).default as NonNullable<T>;
        return some(project);
    } catch (error) {
        console.log('Local project Error', error);
        return none();
    }
};

export const findProjectIndex = async (localRegistryPath: string, projectName: string) => {
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

export const installFor = async <T>(
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
