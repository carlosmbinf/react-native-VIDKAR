import React, {useState, useCallback, useMemo} from 'react';
import {Alert, Keyboard} from 'react-native';
import {Card, TextInput, Button, HelperText, Divider} from 'react-native-paper';
import {sendMessage} from '../../services/notifications/PushMessaging';

type Props = {
  toUserId: string;
  defaultTitle?: string;
  onSent?: (payload: {toUserId: string; title: string; body: string}) => void;
};

const TITLE_MAX = 60;
const BODY_MAX = 280;
const URL_MAX = 2048;
const isValidHttpUrl = (u: string) => /^(https?:\/\/)[^\s]+$/i.test(u);

const SendPushMessageCard: React.FC<Props> = ({toUserId, defaultTitle, onSent}) => {
  const [title, setTitle] = useState(defaultTitle || 'Mensaje');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sending, setSending] = useState(false);

  const canSend = useMemo(() => !!toUserId && body.trim().length > 0 && !sending, [toUserId, body, sending]);

  const onClear = useCallback(() => {
    setTitle(defaultTitle || '');
    setBody('');
    setImageUrl('');
  }, [defaultTitle]);

  const onSend = useCallback(async () => {
    if (sending) return;
    if (!toUserId) {
      Alert.alert('Error', 'toUserId no válido');
      return;
    }
    const t = (title || '').trim().slice(0, TITLE_MAX) || 'Mensaje';
    const b = (body || '').trim().slice(0, BODY_MAX);
    const img = (imageUrl || '').trim();
    if (!b) {
      Alert.alert('Falta mensaje', 'Escribe el mensaje a enviar.');
      return;
    }

    Keyboard.dismiss();
    setSending(true);
    try {
      await sendMessage({
        toUserId,
        title: t,
        body: b,
        data: {
          toUserId,
          ...(img && isValidHttpUrl(img) ? {imageUrl: img} : {}),
        },
        // Nota: si el backend soporta notification.image, considerar enviar { image: img }.
      });
      Alert.alert('Enviado', 'El mensaje fue enviado correctamente.');
      setBody('');
      onSent?.({toUserId, title: t, body: b});
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  }, [sending, toUserId, title, body, imageUrl, onSent]);

  return (
    <Card style={{margin: 12}} testID="send-push-card">
      <Card.Title
        title="Enviar notificación"
        subtitle={`Para: ${toUserId}`}
        // left={(props) => <Card.Icon {...props} icon="bell-outline" />}
      />
      {isValidHttpUrl((imageUrl || '').trim()) ? (
        <Card.Cover
          source={{uri: imageUrl}}
          style={{marginHorizontal: 12, marginBottom: 8}}
          testID="image-preview"
        />
      ) : null}
      <Card.Content>
        <TextInput
          label="Título"
          value={title}
          onChangeText={setTitle}
          mode="outlined"
          dense
          maxLength={TITLE_MAX}
          left={<TextInput.Icon icon="format-title" />}
          right={<TextInput.Affix text={`${(title || '').length}/${TITLE_MAX}`} />}
          accessibilityLabel="Campo título de la notificación"
          testID="input-title"
          style={{marginBottom: 8}}
        />
        <TextInput
          label="Mensaje"
          value={body}
          onChangeText={setBody}
          mode="outlined"
          multiline
          numberOfLines={4}
          maxLength={BODY_MAX}
          left={<TextInput.Icon icon="text" />}
          right={<TextInput.Affix text={`${(body || '').length}/${BODY_MAX}`} />}
          accessibilityLabel="Campo cuerpo del mensaje"
          testID="input-body"
          style={{marginBottom: 8}}
        />
        <TextInput
          label="URL de imagen (opcional)"
          value={imageUrl}
          onChangeText={setImageUrl}
          mode="outlined"
          dense
          maxLength={URL_MAX}
          left={<TextInput.Icon icon="image-outline" />}
          accessibilityLabel="Campo URL de imagen para notificación"
          testID="input-image-url"
        />
        <HelperText
          type={imageUrl.trim().length > 0 && !isValidHttpUrl(imageUrl.trim()) ? 'error' : 'info'}
          visible={imageUrl.trim().length > 0}
        >
          {isValidHttpUrl(imageUrl.trim())
            ? 'Se mostrará imagen en Android (Big Picture) si el backend la soporta.'
            : 'Ingresa una URL válida que comience con http:// o https://'}
        </HelperText>
        <HelperText type={body.trim() ? 'info' : 'error'} visible={true}>
          {body.trim()
            ? 'El mensaje será enviado como notificación push.'
            : 'El mensaje no puede estar vacío.'}
        </HelperText>
      </Card.Content>
      <Divider />
      <Card.Actions>
        <Button
          mode="text"
          onPress={onClear}
          disabled={sending || (!(title || '').trim() && !(body || '').trim() && !(imageUrl || '').trim())}
          icon="broom"
          testID="btn-clear"
        >
          Limpiar
        </Button>
        <Button
          mode="contained"
          onPress={onSend}
          loading={sending}
          disabled={!canSend}
          icon="send"
          testID="btn-send"
        >
          Enviar
        </Button>
      </Card.Actions>
    </Card>
  );
};

export default SendPushMessageCard;
