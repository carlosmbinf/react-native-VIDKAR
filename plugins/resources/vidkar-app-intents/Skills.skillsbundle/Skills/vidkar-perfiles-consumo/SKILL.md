---
name: vidkar-perfiles-consumo
description: Encuentra perfiles y clientes autorizados de VIDKAR por nombre o @usuario y consulta estado, uso, cuota y vencimiento actual de Proxy y VPN.
---
## Resolver la cuenta

- «Busca a Carlos Medina» o «¿qué sabes de @carlos?» usa la búsqueda de perfiles. Envía solo el nombre indicado o el identificador con arroba, como «@carlos», para una búsqueda exacta. «Muéstrame mi perfil» usa esa búsqueda con el usuario omitido.
- Si aparecen varios resultados, muestra sus fichas con nombre y arroba y deja que la persona elija. Cuando elija, conserva el @usuario devuelto por VIDKAR. Si pide actualizar o ampliar el perfil, vuelve a buscar por ese @usuario exacto. Si no se pudo identificar a la otra persona, pide su @usuario.
- En un seguimiento como «¿y cuánto ha consumido?», reutiliza el @usuario que se resolvió. Omite la cuenta únicamente si se trata de la propia. Si una consulta de otra persona falla, conserva el usuario solicitado al reintentar.

## Elegir el servicio

Para «cuánto usó», «cuánto le queda», «está conectada» o «cuándo vence» usa la consulta de consumo. Si especifican Proxy o VPN, pasa ese servicio. Si piden el consumo general, deja el servicio vacío para obtener ambos. Muestra las fichas por servicio con los datos disponibles. Distingue bytes usados, límite, plan ilimitado y vencimiento. Un dato ausente no equivale a cero. Esta consulta devuelve el estado actual. Si piden un historial por días o meses, explica esa limitación.

Si la persona habla del precio o de planes nuevos, usa el catálogo del servicio. Si pregunta por las compras u órdenes de ese perfil, usa la consulta de actividad de cuenta y conserva el @usuario elegido. Presenta los datos privados en la ficha y usa una frase breve para acompañarla.
