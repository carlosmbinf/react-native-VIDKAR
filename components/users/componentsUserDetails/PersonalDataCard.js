import React, {memo} from 'react';
import {View} from 'react-native';
import {Card, Title, Text, Avatar, Chip, Divider, HelperText, IconButton} from 'react-native-paper';

// Utils añadidas / modificadas
const parseProfileNames = (profile = {}) => {
  const rawFirst = (profile.firstName || '').trim();
  const lastName = (profile.lastName || '').trim();
  const tokens = rawFirst.split(/\s+/).filter(Boolean);
  const firstGiven = tokens[0] || '';
  const secondGiven = tokens[1] || ''; // solo si existe segundo nombre en firstName
  // Si existiera middleName legacy y no hay segundoGiven, opcionalmente podríamos usarlo:
  const effectiveSecond = secondGiven || profile.middleName || '';
  const fullName = [firstGiven, effectiveSecond, lastName].filter(Boolean).join(' ');
  return {firstGiven, secondGiven: effectiveSecond, lastName, fullName};
};

const getInitials = (full = '') =>
  full
    .split(/\s+/)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

const hashColor = (seed = '') => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  const c = (h & 0x00ffffff).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

// Actualizada: sólo exige primer nombre y apellido
const computeCompleteness = ({firstGiven, lastName}) => {
  const fields = ['firstGiven', 'lastName'];
  const present = fields.filter(f =>
    f === 'firstGiven' ? !!firstGiven : !!lastName,
  );
  return {
    percent: Math.round((present.length / fields.length) * 100),
    missing: [
      !firstGiven && 'primer nombre',
      !lastName && 'apellidos',
    ].filter(Boolean),
  };
};

const PersonalDataCard = ({item, styles}) => {
  if (!item) return null;

  const profile = item.profile || {};
  const {firstGiven, secondGiven, lastName, fullName} = parseProfileNames(profile);
  const completeness = computeCompleteness({firstGiven, lastName});
  const accentColor = hashColor(fullName || item._id || 'U');

  return (
    <Card
      elevation={12}
      style={[styles.cards, {overflow: 'hidden'}]}
      testID="personal-data-card">
      {/* Barra decorativa */}
      <View style={{height: 4, backgroundColor: accentColor, width: '100%'}} />
      <Card.Content style={{paddingTop: 10}}>
        <View style={[styles.element, {paddingBottom: 4}]}>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            {item.picture ? (
              // Antes: Card.Actions con justifyContent space-around (desplaza/centra visualmente)
              <View style={{marginRight: 12}}>
                <Avatar.Image size={50} source={{uri: item.picture}} />
              </View>
            ) : (
              <Avatar.Text
                size={52}
                label={getInitials(fullName || item.username)}
                style={{backgroundColor: accentColor, marginRight: 12}}
              />
            )}

            <View style={{flex: 1, alignItems: 'flex-start'}}>
              <Title
                style={[styles.title, {marginBottom: 4, textAlign: 'left', alignSelf: 'flex-start'}]}
                numberOfLines={1}
                testID="pd-fullname">
                {fullName || 'Nombre no definido'}
              </Title>

              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>
                <Chip
                  compact
                  icon={
                    completeness.percent === 100 ? 'check-circle' : 'progress-alert'
                  }
                  selectedColor={
                    completeness.percent === 100 ? '#2E7D32' : '#FF8F00'
                  }
                  style={{
                    backgroundColor:
                      completeness.percent === 100 ? '#E8F5E9' : '#FFF8E1',
                    marginRight: 6,
                    marginBottom: 4,
                  }}
                  textStyle={{fontSize: 11}}
                  testID="pd-completeness">
                  {completeness.percent === 100
                    ? 'Completo'
                    : `Incompleto (${completeness.percent}%)`}
                </Chip>
              </View>
            </View>
          </View>
        </View>

        <Divider style={{marginVertical: 8}} />

        {/* Campos */}
        <View style={{gap: 6}}>
          <View style={{flexDirection: 'row'}}>
            <Text style={{width: 100, fontSize: 13, opacity: 0.6}}>Nombre</Text>
            <Text style={[styles.data, {flex: 1}]}>
              {firstGiven || '—'}
            </Text>
          </View>
          <View style={{flexDirection: 'row'}}>
            <Text style={{width: 100, fontSize: 13, opacity: 0.6}}>Segundo</Text>
            <Text style={[styles.data, {flex: 1}]}>
              {secondGiven || '—'}
            </Text>
          </View>
          <View style={{flexDirection: 'row'}}>
            <Text style={{width: 100, fontSize: 13, opacity: 0.6}}>Apellidos</Text>
            <Text style={[styles.data, {flex: 1}]}>
              {lastName || '—'}
            </Text>
          </View>
          {/* Nueva fila Móvil (valor crudo) */}
          <View style={{flexDirection: 'row'}}>
            <Text style={{width: 100, fontSize: 13, opacity: 0.6}}>Móvil</Text>
            <Text style={[styles.data, {flex: 1}]}>
              {item.movil || item.mobile || item.phone || '—'}
            </Text>
          </View>
        </View>

        {completeness.percent < 100 && (
          <HelperText
            type="info"
            visible
            style={{marginTop: 8, fontSize: 11, opacity: 0.75}}>
            Completa los campos faltantes: {completeness.missing.join(', ')}
          </HelperText>
        )}
      </Card.Content>
    </Card>
  );
};

export default memo(PersonalDataCard);
