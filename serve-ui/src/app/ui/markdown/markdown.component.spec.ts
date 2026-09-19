import { TestBed } from '@angular/core/testing';
import { expect, it } from 'vitest';
import { Markdown } from './markdown.component';

async function render(value: string): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(Markdown);
  fixture.componentRef.setInput('value', value);
  await fixture.whenStable();
  return fixture.nativeElement;
}

async function check(value: string, selector: string, attribute: string, expected: string) {
  const root = await render(value);
  expect(root.querySelector(selector)?.getAttribute(attribute)).toBe(expected);
  return root;
}

it("serve-markdown-resources Ссылки и встроенные ресурсы в Markdown Ссылки При отображении Markdown-ссылки `[Документ](docs/readme.txt)` её href равен /api/files?path=docs%2Freadme.txt", async () => {
  await check('[Документ](docs/readme.txt)', 'a', 'href', '/api/files?path=docs%2Freadme.txt');
});

it("serve-markdown-resources Ссылки и встроенные ресурсы в Markdown Ссылки При отображении Markdown-ссылки с HTTP(S)-адресом её href сохраняет исходный адрес", async () => {
  for (const url of ['http://example.com/a', 'HTTPS://example.com/a']) await check('[Документ](' + url + ')', 'a', 'href', url);
});

it("serve-markdown-resources Ссылки и встроенные ресурсы в Markdown Ссылки При преобразовании локального адреса Markdown-ссылки её видимый текст сохраняется", async () => {
  expect((await render('[**Документ**](docs/readme.txt)')).querySelector('a')?.textContent).toBe('Документ');
});

it("serve-markdown-resources Ссылки и встроенные ресурсы в Markdown Ссылки При отображении Markdown-ссылки `[Отчёт](reports/report.html)` она остаётся ссылкой с href /api/files?path=reports%2Freport.html", async () => {
  await check('[Отчёт](reports/report.html)', 'a', 'href', '/api/files?path=reports%2Freport.html');
});

it("serve-markdown-resources Ссылки и встроенные ресурсы в Markdown Изображения При отображении Markdown-изображения `![Схема](images/schema.png)` создаётся изображение с src /api/files?path=images%2Fschema.png", async () => {
  await check('![Схема](images/schema.png)', 'img', 'src', '/api/files?path=images%2Fschema.png');
});

it("serve-markdown-resources Ссылки и встроенные ресурсы в Markdown Изображения При отображении Markdown-изображения с HTTP(S)-адресом без расширения .html его src сохраняет исходный адрес", async () => {
  for (const url of ['http://example.com/a.png', 'HTTPS://example.com/a.png']) await check('![Схема](' + url + ')', 'img', 'src', url);
});

it("serve-markdown-resources Ссылки и встроенные ресурсы в Markdown Изображения При преобразовании локального адреса Markdown-изображения его альтернативный текст сохраняется", async () => {
  expect((await render('![Схема](images/schema.png)')).querySelector('img')?.alt).toBe('Схема');
});

it("serve-markdown-resources Ссылки и встроенные ресурсы в Markdown Кодирование адресов При отображении локальной Markdown-ссылки или изображения путь разрешается относительно каталога запуска serve независимо от расположения YAML-файла и текущего маршрута интерфейса", async () => {
  window.history.replaceState(null, '', '/features/nested');
  try { for (const prefix of ['', '!']) await check(prefix + '[Файл](docs/file.png)', prefix ? 'img' : 'a', prefix ? 'src' : 'href', '/api/files?path=docs%2Ffile.png'); }
  finally { window.history.replaceState(null, '', '/'); }
});

it("serve-markdown-resources Ссылки и встроенные ресурсы в Markdown Кодирование адресов При отображении локальной Markdown-ссылки или изображения пробел в адресе кодируется как %20 в параметре path", async () => {
  for (const prefix of ['', '!']) await check(prefix + '[Файл](<a b.png>)', prefix ? 'img' : 'a', prefix ? 'src' : 'href', "/api/files?path=a%20b.png");
});

it("serve-markdown-resources Ссылки и встроенные ресурсы в Markdown Кодирование адресов При отображении локальной Markdown-ссылки или изображения кириллица в адресе кодируется в параметре path как процентные последовательности байтов UTF-8", async () => {
  for (const prefix of ['', '!']) await check(prefix + '[Файл](<схема.png>)', prefix ? 'img' : 'a', prefix ? 'src' : 'href', "/api/files?path=%D1%81%D1%85%D0%B5%D0%BC%D0%B0.png");
});

it("serve-markdown-resources Ссылки и встроенные ресурсы в Markdown Кодирование адресов При отображении локальной Markdown-ссылки или изображения символ # в адресе кодируется как %23 внутри path и не становится фрагментом URL API", async () => {
  for (const prefix of ['', '!']) await check(prefix + '[Файл](<a#b.png>)', prefix ? 'img' : 'a', prefix ? 'src' : 'href', "/api/files?path=a%23b.png");
});

it("serve-markdown-resources Ссылки и встроенные ресурсы в Markdown Кодирование адресов При отображении локальной Markdown-ссылки или изображения символ ? в адресе кодируется как %3F внутри path", async () => {
  for (const prefix of ['', '!']) await check(prefix + '[Файл](<a?b.png>)', prefix ? 'img' : 'a', prefix ? 'src' : 'href', "/api/files?path=a%3Fb.png");
});

it("serve-markdown-resources Ссылки и встроенные ресурсы в Markdown Кодирование адресов При отображении локальной Markdown-ссылки или изображения символ & в адресе кодируется как %26 внутри path и не создаёт дополнительный query-параметр", async () => {
  for (const prefix of ['', '!']) await check(prefix + '[Файл](<a&b.png>)', prefix ? 'img' : 'a', prefix ? 'src' : 'href', "/api/files?path=a%26b.png");
});

it("serve-markdown-resources Ссылки и встроенные ресурсы в Markdown Кодирование адресов При отображении локальной Markdown-ссылки или изображения символ % в адресе кодируется как %25 внутри path и восстанавливается после однократного декодирования сервером", async () => {
  for (const prefix of ['', '!']) await check(prefix + '[Файл](<a%20b.png>)', prefix ? 'img' : 'a', prefix ? 'src' : 'href', "/api/files?path=a%2520b.png");
});

it("serve-markdown-resources Ссылки и встроенные ресурсы в Markdown HTML в iframe При отображении Markdown-изображения `![Отчёт](reports/report.html)` вместо изображения создаётся iframe с src /api/files?path=reports%2Freport.html", async () => {
  const root = await check('![Отчёт](reports/report.html)', 'iframe', 'src', '/api/files?path=reports%2Freport.html');
  expect(root.querySelector('img')).toBeNull();
  expect(root.querySelector('iframe')?.title).toBe('Отчёт');
});

// jsdom does not load iframe documents; verify this scenario in a browser.
it.skip("serve-markdown-resources Ссылки и встроенные ресурсы в Markdown HTML в iframe При успешной загрузке локального HTML-файла через API его содержимое отображается внутри iframe на странице Markdown", () => {});

it("serve-markdown-resources Ссылки и встроенные ресурсы в Markdown HTML в iframe При отображении Markdown-изображения с HTTP(S)-адресом на .html создаётся iframe с исходным адресом в src", async () => {
  for (const url of ['https://example.com/report.html?x=1#part', 'HTTP://example.com/report.html']) await check('![Отчёт](' + url + ')', 'iframe', 'src', url);
});

it("serve-markdown-resources Ссылки и встроенные ресурсы в Markdown HTML в iframe При отображении Markdown-изображения с расширением .HTML создаётся iframe по тем же правилам, что и для .html", async () => {
  for (const url of ['report.HTML', 'https://example.com/report.HTML?q=1#x']) await check('![Отчёт](' + url + ')', 'iframe', 'src', url.startsWith('https:') ? url : '/api/files?path=report.HTML');
});

