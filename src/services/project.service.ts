import { hash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import axios from 'axios';

export const downloadProjectAndGetName = async (
    projectsRegistryUrl: string,
    projectsDirectory: string,
    projectName: string
) => {
    const projectArchiveUrl = `${projectsRegistryUrl}/${projectName}/latest`;

    try {
        const downloadInfo = (
            await axios.get(projectArchiveUrl, {
                headers: {
                    Accept: 'application/json'
                }
            })
        ).data.dist;

        const tarball = downloadInfo.tarball;
        const fileName = tarball.split('/').pop();
        const filePath = `${projectsDirectory}/${removeVersionAndExtension(fileName)}/${fileName}`;

        const { data } = await axios.get(tarball, {
            responseType: 'arraybuffer'
        });

        await Bun.write(filePath, data);
        console.log(`Project ${projectName} has been downloaded`);

        controlPackageIntegrity(downloadInfo.integrity as string, filePath, projectName);

        return fileName;
    } catch (err) {
        throw Error(`Could not download ${projectName} at url ${projectArchiveUrl}: ${err}`);
    }
};

export const removeVersionAndExtension = (projectName: string) => {
    const extensionSeparator = '.';
    const versionSeparator = '-';

    return projectName
        .replace('-latest', '')
        .split(extensionSeparator)
        .slice(0, -1)
        .join(extensionSeparator)
        .split(versionSeparator)
        .slice(0, -1)
        .join(versionSeparator);
};

export const generateChecksumFile = (fileName: string, algorithm: string): string => {
    const fileData = readFileSync(fileName);
    return hash(algorithm, fileData, 'base64');
};

export const controlPackageIntegrity = (
    downloadDataIntegrity: string,
    filePath: string,
    projectName: string
) => {
    const [algorithm, integrity] = downloadDataIntegrity.split('-');
    const generatedChecksum = generateChecksumFile(filePath, algorithm);
    if (generatedChecksum !== integrity)
        throw Error(`Could not verify ${projectName} package integrity`);
};
