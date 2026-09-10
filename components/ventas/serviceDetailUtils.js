import { formatMoney, getCartItemType, megasToGB } from "./ventasUtils";

const text = (value) => typeof value === "string" ? value.trim() : "";
const number = (value) => {
  if ((typeof value !== "number" && typeof value !== "string") || value === "" || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};
const money = (value, currency) => {
  const amount = number(value);
  return amount === null ? "" : formatMoney(amount, text(currency).toUpperCase()).trim();
};
const TYPES = {
  PROXY: "PROXY_VPN", VPN: "PROXY_VPN", "FECHA-PROXY": "PROXY_VPN",
  "FECHA-VPN": "PROXY_VPN", VPNPLUS: "PROXY_VPN", VPN2MB: "PROXY_VPN", MEGAS: "PROXY_VPN",
  REMESA: "REMESAS", RECARGA: "RECARGAS", CURSO: "CURSOS", COMERCIO: "COMERCIO",
};

// Solo datos del snapshot de compra: no infiere acceso actual ni consulta perfiles.
export function getServiceDetail(item, sale = {}) {
  item = item && typeof item === "object" ? item : {};
  const product = item.producto || {};
  const type = getCartItemType(item);
  const category = TYPES[type] || (type ? "OTROS" : sale.category) || "OTROS";
  const fields = [];
  const add = (label, value) => {
    const display = typeof value === "number" ? String(value) : text(value);
    if (display) fields.push({ label, value: display });
  };
  let title = text(product.titulo) || text(product.name) || text(product.nombre) || text(item.name);
  let highlight = "";
  let highlightLabel = "";
  let priceLabel = "Importe del producto";
  let price = money(item.cobrarUSD, item.monedaACobrar);

  switch (category) {
    case "PROXY_VPN": {
      const service = type.includes("VPN") ? "VPN" : type === "PROXY" || type.includes("PROXY") || type === "MEGAS" ? "Proxy" : "Proxy / VPN";
      const timed = item.esPorTiempo === true || type.startsWith("FECHA-");
      const megas = number(item.megas ?? product.megas);
      const unlimited = timed || item.isIlimitado === true || (megas !== null && megas >= 999999);
      title = `Plan ${service}`;
      highlightLabel = "Datos incluidos";
      highlight = unlimited ? "Ilimitados" : megas === null ? "Cuota no registrada" : megas === 0 ? "0 MB" : megasToGB(megas);
      add("Modalidad", timed ? "Por tiempo" : unlimited ? "Datos ilimitados" : "Por consumo");
      const months = number(item.cantidad ?? product.cantidad);
      if (timed && months > 0) add("Período contratado", `${months} ${months === 1 ? "mes" : "meses"}`);
      const days = number(item.duracionDias ?? product.duracionDias);
      if (days > 0) add("Duración registrada", `${days} días`);
      add("Cuenta", item.nombre);
      priceLabel = timed ? "Precio por mes" : "Precio del paquete";
      price = money(item.precioBaseProxyVPN ?? item.cobrarUSD, item.monedaACobrar);
      break;
    }
    case "REMESAS":
      title = text(item.nombre) || text(item.destinatario) || "Remesa a Cuba";
      highlightLabel = "Recibe en Cuba";
      highlight = money(item.recibirEnCuba, item.monedaRecibirEnCuba);
      add("Destinatario", item.nombre || item.destinatario);
      add("Forma de entrega", item.tarjetaCUP ? "Transferencia a tarjeta" : item.metodoPago);
      add("Tarjeta destino", item.tarjetaCUP);
      add("Dirección de entrega", item.direccionCuba);
      // El formulario de remesas registra cobrarUSD como importe de origen en USD.
      priceLabel = "Importe de origen";
      price = money(item.cobrarUSD, item.monedaACobrar || "USD");
      break;
    case "RECARGAS": {
      title = title || "Recarga móvil";
      highlightLabel = "Móvil de destino";
      highlight = text(item.movilARecargar) || text(item.extraFields?.mobile_number) || text(product.movil);
      const destination = product.destination || item.destination;
      add("Importe de recarga", money(destination?.amount, destination?.currency));
      add("Beneficiario", item.nombre);
      break;
    }
    case "CURSOS":
      title = title || "Curso VIDKAR";
      highlightLabel = "Tipo de compra";
      highlight = "Suscripción al curso";
      add("Profesor", product.profesorNombre);
      add("Estudiante", item.nombre);
      priceLabel = "Importe de suscripción";
      break;
    case "COMERCIO": {
      title = title || "Producto de comercio";
      const quantity = number(item.cantidad);
      highlightLabel = "Cantidad solicitada";
      highlight = quantity === null ? "Cantidad no registrada" : `${quantity} ${quantity === 1 ? "unidad" : "unidades"}`;
      add("Tienda", item.tienda?.nombre || item.tienda?.name);
      add("Entrega", item.recogidaEnLocal === true ? "Recogida en el local" : item.recogidaEnLocal === false ? "Envío a domicilio" : "");
      if (item.recogidaEnLocal !== true) add("Dirección de entrega", sale.rawDoc?.direccionEntrega || item.direccionCuba);
      priceLabel = "Precio unitario";
      price = money(item.cobrarUSD ?? product.precio, item.monedaACobrar || product.monedaPrecio);
      break;
    }
    default:
      title = title || text(item.nombre) || "Servicio adquirido";
      add("Tipo", type);
      add("Cantidad", number(item.cantidad));
  }

  const dtshopStatus = text(item.dtshopStatus).toUpperCase();
  const dtshopCompleted = category === "RECARGAS" && dtshopStatus === "COMPLETED";
  const dtshopFailed = category === "RECARGAS" && ["REJECTED", "CANCELLED", "DECLINED", "REVERSED", "REJECTED-INSUFFICIENT-BALANCE"].includes(dtshopStatus);
  return { category, title, highlight, highlightLabel, fields, price, priceLabel,
    note: text(item.comentario),
    delivered: category === "RECARGAS" ? (dtshopStatus ? dtshopCompleted : null) : typeof item.entregado === "boolean" ? item.entregado : null,
    dtshopStatus: dtshopStatus || null,
    dtshopDeliveryState: dtshopCompleted ? "ENTREGADO" : dtshopFailed ? "NO_ENTREGADO" : dtshopStatus ? "EN_PROCESO" : null,
  };
}