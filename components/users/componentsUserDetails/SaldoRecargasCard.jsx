import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, ActivityIndicator, IconButton, Chip, Surface } from 'react-native-paper';
import Meteor from '@meteorrn/core';

const EXTRAER_NUMERO = (data) => {
  if (data == null) return null;
  if (typeof data === 'number') return data;
  if (typeof data === 'string') {
    const n = Number(data);
    return isNaN(n) ? null : n;
  }
  // Buscar claves típicas
  for (const k of ['available', 'balance', 'amount', 'saldo', 'availableBalance']) {
    if (data[k] != null) {
      const val = EXTRAER_NUMERO(data[k]);
      if (val != null) return val;
    }
  }
  return null;
};

const SaldoRecargasCard = ({ refreshKey = 0 }) => {
  const [saldoRaw, setSaldoRaw] = useState(null);
  const [saldo, setSaldo] = useState(null);
  const [balances, setBalances] = useState([]); // NUEVO: lista de balances normalizados
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [cooldown, setCooldown] = useState(0);

  const intervalRef = useRef(null);
  const countdownRef = useRef(null);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  const REFRESH_SECONDS = 60; // NUEVO: centralizamos el valor del ciclo

  const formatear = (n) =>
    new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(n);

  // NUEVO: parser de balances múltiples
  const parseBalances = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) {
      return data
        .map(b => {
          const amount = EXTRAER_NUMERO(
            b.available ?? b.balance ?? b.amount ?? b.saldo
          );
          return {
            amount,
            currency: b.currency || b.unit || 'USD',
            unitType: b.unitType || 'CURRENCY'
          };
        })
        .filter(b => b.amount != null);
    }
    if (typeof data === 'object') {
      const amount = EXTRAER_NUMERO(data);
      if (amount != null) {
        return [{
          amount,
          currency: data.currency || data.unit || 'USD',
          unitType: data.unitType || 'CURRENCY'
        }];
      }
      return [];
    }
    const amount = EXTRAER_NUMERO(data);
    return amount != null ? [{ amount, currency: 'USD', unitType: 'CURRENCY' }] : [];
  };

  const fetchBalance = useCallback((forzado = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading((prev) => prev && !forzado);
    setError(null);
    new Promise((resolve, reject) => {
      Meteor.call('dtshop.getBalance', (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    })
      .then((data) => {
        if (!mountedRef.current) return;
        setSaldoRaw(data);
        const lista = parseBalances(data); // NUEVO
        setBalances(lista);                // NUEVO
        const numeric =
          lista.length > 1
            ? lista.reduce((acc, b) => acc + (b.amount || 0), 0)
            : lista[0]?.amount ?? EXTRAER_NUMERO(data);
        setSaldo(numeric);
        setLastUpdated(new Date());
      })
      .catch((err) => {
        if (!mountedRef.current) return;
        setError(err?.reason || err?.message || 'Error desconocido');
      })
      .finally(() => {
        if (!mountedRef.current) return;
        setLoading(false);
        fetchingRef.current = false;
        setCooldown(REFRESH_SECONDS); // CAMBIO: usar constante
      });
  }, [REFRESH_SECONDS]); // ACTUALIZADO dependency

  // Countdown + trigger automático unificados
  useEffect(() => {
    countdownRef.current && clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          // Cuando llega a 0 (o 1->0) disparamos fetch si no está en curso
          if (!fetchingRef.current) {
            fetchBalance();
          }
          return 0; // Se quedará en 0 hasta que fetchBalance lo reinicie (finally)
        }
        return c - 1;
      });
    }, 1000);
    return () => countdownRef.current && clearInterval(countdownRef.current);
  }, [fetchBalance]);

  // Eliminado el efecto que creaba un intervalo aparte de 60s
  // useEffect(() => { ...intervalRef con 60000ms ... }, [fetchBalance]); // REMOVIDO

  // Inicial: primer fetch forzado
  useEffect(() => {
    fetchBalance(true);
  }, [fetchBalance]);

  // Refresh manual externo (refreshKey)
  useEffect(() => {
    if (refreshKey >= 0) fetchBalance(true);
  }, [refreshKey, fetchBalance]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      // intervalRef.current && clearInterval(intervalRef.current); // YA NO NECESARIO
      countdownRef.current && clearInterval(countdownRef.current);
    };
  }, []);

  // Ajuste de currency cuando hay múltiples
  const currency =
    balances.length === 1
      ? balances[0].currency
      : (saldoRaw?.currency || saldoRaw?.unit || 'USD');

  return (
    <Card elevation={12} style={styles.card}>
      <Card.Title
        title="Saldo Disponible Recargas"
        subtitle={
          lastUpdated
            ? `Actualizado: ${lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
            : 'Obteniendo saldo...'
        }
        right={(props) => (
          <IconButton
            {...props}
            icon="refresh"
            onPress={() => fetchBalance(true)}
            disabled={loading}
            accessibilityLabel="Refrescar saldo"
          />
        )}
        titleStyle={styles.title}
        subtitleStyle={styles.subtitle}
      />
      <Card.Content style={styles.content}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Consultando saldo...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>Error: {error}</Text>
            <Text style={styles.retryHint}>Deslice para refrescar o pulse el icono.</Text>
          </View>
        ) : saldo != null ? (
          <View style={styles.valueWrapper}>
            <Text style={styles.amount}>{saldo}</Text>
            <Text style={styles.symbol}>
              {balances.length > 1 ? 'TOTAL' : currency}
            </Text>
          </View>
        ) : (
          <Text style={styles.noData}>No se pudo interpretar el saldo.</Text>
        )}

        <View style={styles.metaRow}>
          <Chip
            compact
            icon="history"
            style={styles.chip}
            textStyle={styles.chipText}
          >
            Auto en {cooldown}s
          </Chip>
        </View>
        {/* {balances.length > 0 && (
          <View style={styles.balancesRow}>
            {balances.map((b, idx) => (
              <Chip
                key={`${b.currency}-${idx}`}
                compact
                icon="account-cash-outline"
                style={styles.balanceChip}
                textStyle={styles.balanceChipText}
              >
                {b.currency} {formatear(b.amount)}
              </Chip>
            ))}
          </View>
        )} */}
      </Card.Content>
    </Card>
  );
};

export default SaldoRecargasCard;

const styles = StyleSheet.create({
  card: {
    marginBottom: 20,
    borderRadius: 20
  },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 11 },
  content: { paddingTop: 4 },
  loadingBox: { alignItems: 'center', paddingVertical: 16 },
  loadingText: { fontSize: 11, color: '#666', marginTop: 8 },
  errorBox: { paddingVertical: 6 },
  errorText: { fontSize: 12, color: '#d32f2f', fontWeight: '600' },
  retryHint: { fontSize: 10, color: '#888', marginTop: 4 },
  valueWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginVertical: 4
  },
  symbol: { fontSize: 16, fontWeight: '600', marginRight: 6},
  amount: { fontSize: 24, fontWeight: '700', letterSpacing: -1, },
  noData: { fontSize: 12, textAlign: 'center', color: '#777' },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 10
  },
  chip: {  },
  chipSecondary: {  },
  chipText: { fontSize: 11 },
  balancesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    justifyContent: 'center'
  },
  balanceChip: {
    marginHorizontal: 4,
    marginVertical: 4,
    // backgroundColor: '#f4f6f9'
  },
  balanceChipText: { fontSize: 11, fontWeight: '600' }
});
