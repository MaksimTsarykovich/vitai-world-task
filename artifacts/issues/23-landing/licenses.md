# Лицензии на фотографии лендинга (issue #23)

Фото из макета `artifacts/design/index.html` скачаны в `web/public/images/` и
подключены через `next/image`. Все кадры — с [Unsplash](https://unsplash.com) и
распространяются по [Unsplash License](https://unsplash.com/license), которая
разрешает бесплатное использование, в том числе коммерческое, без указания
авторства (атрибуция приветствуется).

Фотографа определить не удалось: страницы кадров Unsplash и публичный API
закрыты анти-бот проверкой, а в ссылках `images.unsplash.com` сведения об
авторе не передаются. Поэтому у всех кадров автор помечен «автор уточняется» —
это заполняется вручную по странице фото.

| Файл | Кадр (источник) | Фотограф | Лицензия |
|---|---|---|---|
| `web/public/images/hero-beans.jpg` | <https://images.unsplash.com/photo-1524350876685-274059332603> | автор уточняется | Unsplash License |
| `web/public/images/ethiopia.jpg` | <https://images.unsplash.com/photo-1442411210769-b95c4632195e> | автор уточняется | Unsplash License |
| `web/public/images/colombia.jpg` | <https://images.unsplash.com/photo-1587734195503-904fca47e0e9> | автор уточняется | Unsplash License |
| `web/public/images/brazil.jpg` | <https://images.unsplash.com/photo-1610889556528-9a770e32642f> | автор уточняется | Unsplash License |
| `web/public/images/drip.jpg` | <https://images.unsplash.com/photo-1470337458703-46ad1756a187> | автор уточняется | Unsplash License |

## Размеры файлов

Кадры скачаны в тех же пропорциях, что заявлены в макете, и весят меньше 300 КБ:

| Файл | Размер кадра | Вес |
|---|---|---|
| `hero-beans.jpg` | 900×1125 (4:5) | ~169 КБ |
| `ethiopia.jpg` | 600×450 (4:3) | ~79 КБ |
| `colombia.jpg` | 600×450 (4:3) | ~47 КБ |
| `brazil.jpg` | 600×450 (4:3) | ~20 КБ |
| `drip.jpg` | 600×450 (4:3) | ~48 КБ |

## Замечание о двух именах из брифа

Бриф перечисляет ещё `about-holder.jpg` и `delivery-boxes.jpg`, но в финальном
макете `artifacts/design/index.html` таких кадров нет: секции «Свежесть / о нас» и
«Доставка» были удалены ещё в пятом проходе правок (см.
`docs/DESIGN-REVISIONS-3.md`), и фотографии вместе с ними. Эталон — финальный
макет, поэтому выдумывать для этих имён кадры не стали: используются только
пять фото, реально присутствующих в разметке.
