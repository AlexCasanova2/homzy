# Dependencias: avisos conocidos corregidos

La auditoría del 15 de octubre de 2026 termina sin avisos de `npm audit` en los tres paquetes independientes. Las correcciones están verificadas localmente; este informe no acredita un despliegue ni que la aplicación esté libre de otras vulnerabilidades.

## Resultado

| Paquete | Antes: moderados / altos / críticos | Después |
|---|---:|---:|
| Raíz | 0 / 0 / 2 | 0 |
| Cliente | 7 / 11 / 0 | 0 |
| Servidor | 6 / 4 / 1 | 0 |

Los recuentos corresponden a paquetes afectados por el catálogo consultado, no a ataques demostrados ni a vulnerabilidades únicas: algunas dependencias aparecen en varios paquetes. Se auditó el árbol completo, incluidas las herramientas de desarrollo.

## Unidades de cambio

1. **Servidor:** Axios, Express 4, Morgan y sanitize-html, junto con sus dependencias transitivas afectadas. Se mantienen sus versiones mayores y la política de sanitización de Homzy.
2. **Cliente en ejecución:** Vue 3, la familia TipTap 3 alineada y Axios 1. Las pruebas del editor conservan imágenes, tablas, clases y enlaces.
3. **Herramientas y CI:** Vite 5 pasa a Vite 6.4.4, con mínimo 6.4.3 y plugin Vue compatible; Rollup y esbuild quedan parcheados. concurrently pasa a 9.2.5 y utiliza shell-quote 1.12.0. CI incorpora las pruebas de raíz y cliente además de las de servidor.

No se ha usado `npm audit fix --force`, añadido excepciones de auditoría ni debilitado restricciones de afiliación o sanitización.

## Exposición y límites

- **proxy-addr:** el aviso crítico requiere una configuración de confianza de proxies específica. `server/src/app.js` no configura esa subred. Se reprodujo el fallo en un servidor Express aislado con la configuración del aviso: la IP enviada en `X-Forwarded-For` se aceptaba antes del parche y deja de aceptarse después. Esto no demuestra explotación de Homzy.
- **sanitize-html:** el aviso SVG/SMIL exige permitir animaciones SVG. La lista de etiquetas de Homzy ya las excluye; una regresión adicional conserva ese bloqueo tras actualizar.
- **Axios:** se utiliza en cliente y servidor. Se comprobaron JSON, redirecciones permitidas y límites de redirección con HTTP local, además de las pruebas existentes de generación y seguridad de enlaces.
- **Vue y TipTap:** se actualiza el motor del editor, incluida su cadena ProseMirror, sin cambiar el arreglo que mantiene el HTML original.
- **Vite, Rollup y esbuild:** son herramientas de desarrollo o compilación. No equivalen al servidor Express de producción. Se verificaron tanto la compilación como el editor real servido por Vite 6.
- **shell-quote:** la inyección descrita requiere tokens de operador o comentario controlados por un atacante. Los comandos de desarrollo de Homzy son estáticos. Las nuevas pruebas rechazan separadores de línea maliciosos y comprueban la ejecución normal de concurrently, sin ejecutar el contenido de esos tokens.

## Verificación reproducible

Instalación limpia de los tres lockfiles:

```sh
npm ci
npm --prefix server ci
npm --prefix client ci
```

Pruebas y compilación:

```sh
npm test
npm --prefix server test
npm --prefix client test
npm run build
```

Resultado: **4 pruebas de herramientas, 31 de servidor y 10 de cliente correctas; compilación correcta**. Estas verificaciones se repitieron después de las instalaciones limpias.

Auditorías:

```sh
npm audit
npm --prefix server audit
npm --prefix client audit
```

Resultado: **0 avisos en cada paquete** según el catálogo disponible en la fecha indicada. Los resultados pueden cambiar al publicarse nuevos avisos.

La comprobación de navegador utiliza `/test/fixtures/richTextEditor.html` con solo Vite en localhost: edición y guardado exactos en memoria, una sola emisión, protección del modo visual y regreso a visual con HTML sencillo. No realiza peticiones a `/api`, no necesita base de datos y no publica artículos.

## Reversión

Cada unidad tiene un commit independiente. Servidor: manifiesto, lockfile y pruebas HTTP/sanitización. Cliente: manifiesto y lockfile. Herramientas: manifiestos y lockfiles de raíz/cliente, pruebas de herramientas, pasos de CI y documentación. La reversión de una unidad debe repetir sus pruebas y auditoría: recuperar un lockfile anterior también recupera sus avisos conocidos.
