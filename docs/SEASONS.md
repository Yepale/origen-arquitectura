# ORIGEN — Sistema de estaciones

El selector ❄ / ☼ cambia la experiencia completa entre INVIERNO y VERANO.

## Assets

Usar estas 4 imágenes maestras, según viewport:
- `origen_panoramic_winter_16x9.jpg`
- `origen_panoramic_winter_9x16.jpg`
- `origen_panoramic_summer_16x9.jpg`
- `origen_panoramic_summer_9x16.jpg`

Desktop/tablet panorámico: 16:9.
Móvil vertical: 9:16.
El resto de ratios usa `cover` y posicionamiento responsive.

## UX

- Selector visible en intro y landing.
- Móvil: selector también dentro del menú.
- Persistencia con `localStorage`.
- Estado accesible mediante `aria-pressed`.
- Cambio de landing con crossfade.
- La escena 3D recibe el mismo estado para sincronizar iluminación y atmósfera.
