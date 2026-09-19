import assert from 'node:assert/strict';
import { chmod, mkdir, symlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join } from 'node:path';

import { startServer } from '../../src/lib/serve/server';
import { ProjectSnapshotService } from '../../src/lib/serve/snapshot';
import { createProject } from './fixtures';
import { specTest } from './spec-name';

const payload = Buffer.from([0, 255, 128, 13, 10]);

const withServer = async (fn: (context: {
  root: string;
  bytes(path: string, data?: Buffer, mime?: string): Promise<void>;
  success(path: string, data?: Buffer, mime?: string): Promise<void>;
  failure(query: string, status: number, code: string): Promise<void>;
}) => Promise<void>) => {
  const project = await createProject();
  const server = await startServer({ projectRoot: project.root, port: 0, service: { snapshot: {} } });
  const success = async (path: string, data = payload, mime?: string) => {
    const response = await fetch(server.url + '/api/files?path=' + encodeURIComponent(path));
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), data);
    if (mime) assert.equal(response.headers.get('content-type')?.split(';')[0], mime);
  };
  try {
    await fn({
      root: project.root,
      success,
      bytes: async (path, data = payload, mime) => {
        await writeFile(join(project.root, path), data);
        await success(path, data, mime);
      },
      failure: async (query, status, code) => {
        const response = await fetch(server.url + '/api/files' + query);
        assert.equal(response.status, status);
        assert.equal(response.headers.get('content-type')?.split(';')[0], 'application/json');
        const body = await response.json() as { errors: Array<{ code: string; message: string; path: string }> };
        assert.equal(body.errors.length, 1);
        assert.equal(body.errors[0].code, code);
        assert.equal(body.errors[0].path, '/path');
        assert.ok(body.errors[0].message);
        assert.ok(!JSON.stringify(body).includes(project.root));
        assert.ok(!JSON.stringify(body).includes('secret bytes'));
      },
    });
  } finally {
    await server.close();
    await project.dispose();
  }
};

specTest("serve-file-get", "GET /api/files", "Успешный ответ", "GET /api/files с допустимым path существующего обычного файла внутри корня возвращает HTTP 200 и исходные байты файла без преобразований", () =>
  withServer(async ({ root, bytes, success, failure }) => {
    await bytes('binary.dat', Buffer.from([0, 255, 128, 13, 10]));
  }));

specTest("serve-file-get", "GET /api/files", "Успешный ответ", "GET /api/files для пустого файла возвращает HTTP 200 и пустое тело", () =>
  withServer(async ({ root, bytes, success, failure }) => {
    await bytes('empty', Buffer.alloc(0));
  }));

specTest("serve-file-get", "GET /api/files", "Успешный ответ", "GET /api/files разрешает path относительно каталога запуска serve независимо от projectPath в .tms.json и шаблонов yml.files", () =>
  withServer(async ({ root, bytes, success, failure }) => {
    await mkdir(join(root, 'nested'));
    await writeFile(join(root, 'nested', 'same.txt'), 'wrong root');
    await writeFile(join(root, '.tms.json'), JSON.stringify({ api: { host: 'https://example.invalid', project: 'test' }, projectPath: 'nested', yml: { files: ['*.spec.yml'] } }));
    const service = new ProjectSnapshotService(root);
    await service.refresh();
    const configured = await startServer({ projectRoot: root, port: 0, service });
    try {
      await writeFile(join(root, 'same.txt'), 'launch root');
      const response = await fetch(configured.url + '/api/files?path=same.txt');
      assert.equal(response.status, 200);
      assert.equal(await response.text(), 'launch root');
    } finally { await configured.close(); }
  }));

specTest("serve-file-get", "GET /api/files", "Успешный ответ", "GET /api/files с URL-кодированным относительным путём, содержащим пробелы, кириллицу или символы #, ? и %, возвращает HTTP 200 и байты соответствующего файла после однократного декодирования path", () =>
  withServer(async ({ root, bytes, success, failure }) => {
    for (const name of ['файл с пробелами.txt', '#?%.txt', '%2e%2e.txt', '%2520.txt']) await bytes(name);
  }));

specTest("serve-file-get", "GET /api/files", "Успешный ответ", "GET /api/files по симлинку на обычный файл внутри корня возвращает HTTP 200 и байты целевого файла", () =>
  withServer(async ({ root, bytes, success, failure }) => {
    await writeFile(join(root, 'target'), payload);
    await symlink('target', join(root, 'link.txt'));
    await success('link.txt');
  }));

specTest("serve-file-get", "GET /api/files", "Успешный ответ", "GET /api/files с допустимым path существующего файла в режиме --read-only возвращает HTTP 200 и исходные байты файла", () =>
  withServer(async ({ root, bytes, success, failure }) => {
    await writeFile(join(root, 'read-only.txt'), payload);
    const readOnly = await startServer({ projectRoot: root, port: 0, service: { snapshot: {} }, readOnly: true });
    try {
      const response = await fetch(readOnly.url + '/api/files?path=read-only.txt');
      assert.equal(response.status, 200);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), payload);
    } finally { await readOnly.close(); }
  }));

specTest("serve-file-get", "GET /api/files", "MIME-тип ответа", "GET /api/files для существующего файла с расширением .html в декодированном path возвращает HTTP 200 и Content-Type text/html", () =>
  withServer(async ({ root, bytes, success, failure }) => {
    await bytes('file.html', payload, 'text/html');
  }));

specTest("serve-file-get", "GET /api/files", "MIME-тип ответа", "GET /api/files для существующего файла с расширением .css в декодированном path возвращает HTTP 200 и Content-Type text/css", () =>
  withServer(async ({ root, bytes, success, failure }) => {
    await bytes('file.css', payload, 'text/css');
  }));

specTest("serve-file-get", "GET /api/files", "MIME-тип ответа", "GET /api/files для существующего файла с расширением .json в декодированном path возвращает HTTP 200 и Content-Type application/json", () =>
  withServer(async ({ root, bytes, success, failure }) => {
    await bytes('file.json', payload, 'application/json');
  }));

specTest("serve-file-get", "GET /api/files", "MIME-тип ответа", "GET /api/files для существующего файла с расширением .txt в декодированном path возвращает HTTP 200 и Content-Type text/plain", () =>
  withServer(async ({ root, bytes, success, failure }) => {
    await bytes('file.txt', payload, 'text/plain');
  }));

specTest("serve-file-get", "GET /api/files", "MIME-тип ответа", "GET /api/files для существующего файла с расширением .png в декодированном path возвращает HTTP 200 и Content-Type image/png", () =>
  withServer(async ({ root, bytes, success, failure }) => {
    await bytes('file.png', payload, 'image/png');
  }));

specTest("serve-file-get", "GET /api/files", "MIME-тип ответа", "GET /api/files для существующего файла с расширением .jpg в декодированном path возвращает HTTP 200 и Content-Type image/jpeg", () =>
  withServer(async ({ root, bytes, success, failure }) => {
    await bytes('file.jpg', payload, 'image/jpeg');
  }));

specTest("serve-file-get", "GET /api/files", "MIME-тип ответа", "GET /api/files для существующего файла с расширением .jpeg в декодированном path возвращает HTTP 200 и Content-Type image/jpeg", () =>
  withServer(async ({ root, bytes, success, failure }) => {
    await bytes('file.jpeg', payload, 'image/jpeg');
  }));

specTest("serve-file-get", "GET /api/files", "MIME-тип ответа", "GET /api/files для существующего файла с расширением .svg в декодированном path возвращает HTTP 200 и Content-Type image/svg+xml", () =>
  withServer(async ({ root, bytes, success, failure }) => {
    await bytes('file.svg', payload, 'image/svg+xml');
  }));

specTest("serve-file-get", "GET /api/files", "MIME-тип ответа", "GET /api/files для существующего файла с расширением .pdf в декодированном path возвращает HTTP 200 и Content-Type application/pdf", () =>
  withServer(async ({ root, bytes, success, failure }) => {
    await bytes('file.pdf', payload, 'application/pdf');
  }));

specTest("serve-file-get", "GET /api/files", "MIME-тип ответа", "GET /api/files для существующего файла определяет MIME-тип без учёта регистра расширения и возвращает HTTP 200 с одинаковым MIME-типом для .png и .PNG", () =>
  withServer(async ({ root, bytes, success, failure }) => {
    await bytes('image.png', payload, 'image/png');
    await bytes('image.PNG', payload, 'image/png');
  }));

specTest("serve-file-get", "GET /api/files", "MIME-тип ответа", "GET /api/files для существующего файла без расширения возвращает HTTP 200 и Content-Type application/octet-stream", () =>
  withServer(async ({ root, bytes, success, failure }) => {
    await bytes('no-extension', payload, 'application/octet-stream');
  }));

specTest("serve-file-get", "GET /api/files", "MIME-тип ответа", "GET /api/files для существующего файла с неизвестным расширением возвращает HTTP 200 и Content-Type application/octet-stream", () =>
  withServer(async ({ root, bytes, success, failure }) => {
    await bytes('file.unknown', payload, 'application/octet-stream');
  }));

specTest("serve-file-get", "GET /api/files", "Проверка запроса", "GET /api/files без path, с пустым path либо с несколькими или нестроковыми значениями path возвращает HTTP 400 и ErrorResponse с code invalid-request", () =>
  withServer(async ({ root, bytes, success, failure }) => {
    for (const query of ['', '?path=', '?path=a&path=b', '?path[]=a', '?path[x]=a']) await failure(query, 400, 'invalid-request');
  }));

specTest("serve-file-get", "GET /api/files", "Проверка запроса", "GET /api/files с абсолютным путём, включая Windows-путь с буквой диска, обратным слешем, нулевым байтом или сегментом .. после декодирования возвращает HTTP 400 и ErrorResponse с code invalid-request", () =>
  withServer(async ({ root, bytes, success, failure }) => {
    for (const path of ['/etc/passwd', 'C:/file.txt', 'C:relative.txt', '\\server\\share', 'dir\\file', 'a\0b', '..', 'a/../b', '../outside']) await failure('?path=' + encodeURIComponent(path), 400, 'invalid-request');
    await failure('?path=%2e%2e%2foutside', 400, 'invalid-request');
  }));

specTest("serve-file-get", "GET /api/files", "Границы доступа", "GET /api/files с путём, чей файл или родительский каталог является симлинком за пределы корня, возвращает HTTP 403 и ErrorResponse с code forbidden без содержимого целевого файла", () =>
  withServer(async ({ root, bytes, success, failure }) => {
    const outside = await createProject();
    try {
      await writeFile(join(outside.root, 'secret'), 'secret bytes');
      await symlink(join(outside.root, 'secret'), join(root, 'escape'));
      await symlink(outside.root, join(root, 'escape-dir'));
      for (const path of ['escape', 'escape-dir/secret']) await failure('?path=' + path, 403, 'forbidden');
    } finally { await outside.dispose(); }
  }));

specTest("serve-file-get", "GET /api/files", "Границы доступа", "GET /api/files для файла внутри корня, недоступного серверу для чтения из-за прав файловой системы, возвращает HTTP 403 и ErrorResponse с code forbidden", () =>
  withServer(async ({ root, bytes, success, failure }) => {
    await writeFile(join(root, 'private.txt'), payload);
    await chmod(join(root, 'private.txt'), 0);
    try { await failure('?path=private.txt', 403, 'forbidden'); }
    finally { await chmod(join(root, 'private.txt'), 0o600); }
  }));

specTest("serve-file-get", "GET /api/files", "Отсутствующий файл", "GET /api/files с допустимым путём к отсутствующему файлу или оборванному симлинку внутри корня возвращает HTTP 404 и ErrorResponse с code not-found", () =>
  withServer(async ({ root, bytes, success, failure }) => {
    await symlink('missing', join(root, 'broken'));
    for (const path of ['missing', 'broken', 'missing/child']) await failure('?path=' + path, 404, 'not-found');
  }));

specTest("serve-file-get", "GET /api/files", "Отсутствующий файл", "GET /api/files с допустимым путём к каталогу или другому объекту, не являющемуся обычным файлом, внутри корня возвращает HTTP 404 и ErrorResponse с code not-found без списка содержимого каталога", () =>
  withServer(async ({ root, bytes, success, failure }) => {
    await failure('?path=specs', 404, 'not-found');
    await failure('?path=.', 404, 'not-found');
    const socket = createServer();
    await new Promise<void>((resolve, reject) => { socket.once('error', reject); socket.listen(join(root, 'socket'), resolve); });
    try { await failure('?path=socket', 404, 'not-found'); }
    finally { await new Promise<void>((resolve, reject) => socket.close(error => error ? reject(error) : resolve())); }
  }));
