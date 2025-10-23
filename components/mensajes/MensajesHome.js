/**
 * Componente de Chat Profesional
 * Construido con React Native Paper
 * @format
 * @flow strict-local
 */

import React from 'react';
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StyleSheet,
  Appearance,
  Animated,
  TouchableOpacity,
} from 'react-native';
import {
  TextInput,
  IconButton,
  Avatar,
  Text,
  Surface,
  ActivityIndicator,
} from 'react-native-paper';
import Meteor, { withTracker } from '@meteorrn/core';
import { Mensajes as MensajesCollection } from '../collections/collections';
import moment from 'moment';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

class MensajesHome extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      message: '',
      screenHeight: SCREEN_HEIGHT - 90,
      isDarkMode: Appearance?.getColorScheme?.() === 'dark',
      isSending: false,
      inputHeight: 40,
    };
    this.flatListRef = React.createRef();
    this.textInputRef = React.createRef();
    // Animaciones para el botón de envío
    this.sendButtonScale = new Animated.Value(0);
    this.sendButtonRotation = new Animated.Value(0);
  }

  componentDidMount() {
    this.appearanceSubscription = Appearance?.addChangeListener?.(({ colorScheme }) => {
      this.setState({ isDarkMode: colorScheme === 'dark' });
    });
  }

  componentWillUnmount() {
    this.appearanceSubscription?.remove?.();
  }

  componentDidUpdate(prevProps, prevState) {
    // Auto-scroll al recibir nuevos mensajes
    if (prevProps.myTodoTasks.length < this.props.myTodoTasks.length) {
      setTimeout(() => {
        this.flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);
    }

    // Animación del botón de envío
    if (prevState.message.trim() !== this.state.message.trim()) {
      const hasText = this.state.message.trim().length > 0;
      Animated.parallel([
        Animated.spring(this.sendButtonScale, {
          toValue: hasText ? 1 : 0,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(this.sendButtonRotation, {
          toValue: hasText ? 1 : 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }

  handleSend = async () => {
    const { message, isSending } = this.state;
    const { user } = this.props;

    if (!message.trim() || isSending) return;

    this.setState({ isSending: true });

    try {
      await MensajesCollection.insert({
        from: Meteor.userId(),
        to: user,
        mensaje: message.trim(),
        createdAt: new Date(),
        leido: false,
      });

      // Feedback visual exitoso
      this.setState({ message: '', isSending: false, inputHeight: 40 });
      
      // Auto-scroll después de enviar
      setTimeout(() => {
        this.flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      }, 100);

      Meteor.call("enviarMensajeDirecto2",user, message.trim(), {title:Meteor.user()?.username || "SERVER"});
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      this.setState({ isSending: false });
    }
  };

  handleContentSizeChange = (event) => {
    const { height } = event.nativeEvent.contentSize;
    // Limitar altura máxima del input a 100px
    this.setState({ inputHeight: Math.min(Math.max(40, height), 100) });
  };

  renderMessage = ({ item, index }) => {
    const isMyMessage = item.user._id === Meteor.userId();
    const showAvatar = index === 0 || 
      this.props.myTodoTasks[index - 1]?.user._id !== item.user._id;

    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer
      ]}>
        {!isMyMessage && (
          <View style={styles.avatarContainer}>
            {showAvatar ? (
              item.user.avatar ? (
                <Avatar.Image 
                  size={32} 
                  source={{ uri: item.user.avatar }} 
                />
              ) : (
                <Avatar.Text 
                  size={32} 
                  label={item.user.name?.substring(0, 2).toUpperCase() || 'U'} 
                />
              )
            ) : (
              <View style={{ width: 32 }} />
            )}
          </View>
        )}

        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
          { maxWidth: Dimensions.get('window').width * 0.7 }
        ]}>
          {!isMyMessage && showAvatar && (
            <Text style={styles.senderName}>{item.user.name}</Text>
          )}
          
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.otherMessageText
          ]}>
            {item.text}
          </Text>

          <View style={styles.messageFooter}>
            <Text style={[
              styles.timeText,
              isMyMessage ? styles.myTimeText : styles.otherTimeText
            ]}>
              {moment(item.createdAt).format('HH:mm')}
            </Text>
            
            {isMyMessage && (
              <View style={styles.statusContainer}>
                {item.sent && (
                  <IconButton
                    icon={item.received ? 'check-all' : 'check'}
                    size={14}
                    iconColor={item.received ? '#4FC3F7' : '#90A4AE'}
                    style={styles.checkIcon}
                  />
                )}
              </View>
            )}
          </View>
        </View>

        {isMyMessage && <View style={{ width: 8 }} />}
      </View>
    );
  };

  renderHeader = () => {
    const { myTodoTasks } = this.props;
    if (myTodoTasks.length === 0) return null;

    return (
      <View style={styles.headerSpacer}>
        <Text style={styles.dateText}>
          {moment(myTodoTasks[0]?.createdAt).calendar(null, {
            sameDay: '[Hoy]',
            lastDay: '[Ayer]',
            lastWeek: 'dddd',
            sameElse: 'DD/MM/YYYY'
          })}
        </Text>
      </View>
    );
  };

  renderInputToolbar = () => {
    const { message, isSending, inputHeight } = this.state;
    const hasText = message.trim().length > 0;
    const charCount = message.length;
    const isNearLimit = charCount > 900;

    const spin = this.sendButtonRotation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <Surface style={styles.inputContainer} elevation={4}>
        {/* Contador de caracteres (solo visible cerca del límite) */}
        {isNearLimit && (
          <View style={styles.charCountContainer}>
            <Text style={[
              styles.charCountText,
              charCount >= 1000 && styles.charCountLimit
            ]}>
              {charCount}/1000
            </Text>
          </View>
        )}

        <View style={styles.inputRow}>
          {/* Input de texto */}
          <View style={styles.inputWrapper}>
            <TextInput
              ref={this.textInputRef}
              mode="outlined"
              placeholder="Escribe un mensaje..."
              placeholderTextColor="#9E9E9E"
              value={message}
              onChangeText={(text) => this.setState({ message: text })}
              onSubmitEditing={hasText ? this.handleSend : undefined}
              multiline
              maxLength={1000}
              style={[styles.textInput, { height: inputHeight }]}
              outlineColor="transparent"
              activeOutlineColor="transparent"
              dense
              disabled={isSending}
              onContentSizeChange={this.handleContentSizeChange}
              blurOnSubmit={false}
              returnKeyType="send"
            />
          </View>

          {/* Botón de envío animado */}
          {hasText && (
            <Animated.View
              style={[
                styles.sendButtonContainer,
                {
                  transform: [
                    { scale: this.sendButtonScale },
                    { rotate: spin }
                  ],
                  opacity: this.sendButtonScale,
                }
              ]}
            >
              <TouchableOpacity
                onPress={this.handleSend}
                disabled={isSending}
                activeOpacity={0.7}
                style={styles.sendButton}
              >
                <View style={styles.sendButtonBackground}>
                  {isSending ? (
                    <ActivityIndicator size={20} color="#FFFFFF" />
                  ) : (
                    <IconButton
                      icon="send"
                      iconColor="#FFFFFF"
                      size={20}
                      style={styles.sendIcon}
                    />
                  )}
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </Surface>
    );
  };

  render() {
    const { loading, myTodoTasks } = this.props;
    const { screenHeight } = this.state;

    if (loading) {
      return (
        <Surface style={{ height: "100%", flex: 1 }}>
          <View style={[styles.container, styles.loadingContainer]}>
            <ActivityIndicator size="large" color="#3f51b5" />
            <Text style={styles.loadingText}>Cargando mensajes...</Text>
          </View>
        </Surface>
        
      );
    }

    return (
      <Surface style={{ height: "100%", flex: 1 }}>
        <KeyboardAvoidingView
          style={[styles.container, { height: screenHeight }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {myTodoTasks.length === 0 ? (

            <View style={styles.emptyContainer}>
              <IconButton icon="message-outline" size={64} iconColor="#B0BEC5" />
              <Text style={styles.emptyText}>No hay mensajes aún</Text>
              <Text style={styles.emptySubtext}>Inicia la conversación</Text>
            </View>

          ) : (
            <FlatList
              ref={this.flatListRef}
              data={myTodoTasks}
              renderItem={this.renderMessage}
              keyExtractor={(item) => item._id}
              inverted
              contentContainerStyle={styles.messagesList}
              ListHeaderComponent={this.renderHeader}
              showsVerticalScrollIndicator={false}
              initialNumToRender={20}
              maxToRenderPerBatch={10}
              windowSize={10}
            />

          )}

          {this.renderInputToolbar()}
        </KeyboardAvoidingView>
      </Surface>

    );
  }
}

const MensajesHomeWithTracker = withTracker((user) => {
  const { navigation, route } = user;
  const id = user.user;

  const handle = Meteor.subscribe(
    "mensajes",
    {
      $or: [
        { $and: [{ from: id, to: Meteor.userId() }] },
        { $and: [{ from: Meteor.userId(), to: id }] }
      ]
    },
    { sort: { createdAt: -1 } }
  );

  Meteor.subscribe("user", id, {
    fields: {
      "profile.firstName": 1,
      "profile.lastName": 1,
      "services.facebook.picture.data.url": 1,
      "profile.avatar": 1,
    },
  });

  const mensajes = MensajesCollection.find(
    {
      $or: [
        { $and: [{ from: id, to: Meteor.userId() }] },
        { $and: [{ from: Meteor.userId(), to: id }] }
      ]
    },
    { sort: { createdAt: -1 } }
  ).fetch();

  const list = mensajes.map((element) => {
    // Marcar como leído
    if (element.to === Meteor.userId() && !element.leido) {
      MensajesCollection.update(element._id, { $set: { leido: true } });
    }

    const fromUser = Meteor.users.findOne(element.from);
    const firstName = fromUser?.profile?.firstName || '';
    const lastName = fromUser?.profile?.lastName || '';
    const name = `${firstName} ${lastName}`.trim() || 'Usuario';

    // Avatar seguro
    const avatarFromProfile = fromUser?.profile?.avatar;
    const avatarFromFB = fromUser?.services?.facebook?.picture?.data?.url;
    const avatar = (typeof avatarFromProfile === 'string' && avatarFromProfile)
      ? avatarFromProfile
      : (typeof avatarFromFB === 'string' && avatarFromFB ? avatarFromFB : undefined);

    return {
      _id: element._id,
      text: element.mensaje,
      createdAt: element.createdAt ? new Date(element.createdAt) : new Date(),
      user: {
        _id: element.from,
        name,
        avatar,
      },
      sent: true,
      received: !!element.leido,
    };
  });

  return {
    navigation,
    user: user.user,
    myTodoTasks: list,
    loading: !handle.ready(),
  };
})(MensajesHome);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#757575',
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingTop: 16,
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  myMessageContainer: {
    justifyContent: 'flex-end',
  },
  otherMessageContainer: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
    marginBottom: 4,
  },
  messageBubble: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  myMessageBubble: {
    backgroundColor: '#3f51b5',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3f51b5',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#212121',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'flex-end',
  },
  timeText: {
    fontSize: 11,
  },
  myTimeText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  otherTimeText: {
    color: '#9E9E9E',
  },
  statusContainer: {
    marginLeft: 4,
  },
  checkIcon: {
    margin: 0,
    padding: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#757575',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 4,
  },
  headerSpacer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  dateText: {
    fontSize: 12,
    color: '#9E9E9E',
    backgroundColor: '#EEEEEE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inputContainer: {
    // backgroundColor: '#FFFFFF',
    paddingTop: 4,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  charCountContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  charCountText: {
    fontSize: 11,
    color: '#9E9E9E',
  },
  charCountLimit: {
    color: '#F44336',
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  inputWrapper: {
    flex: 1,
    // backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingHorizontal: 4,
    marginHorizontal: 4,
    
  },
  textInput: {
    backgroundColor: 'transparent',
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
  },
  sendButtonContainer: {
    marginBottom: 4,
    marginLeft: 4,
  },
  sendButton: {
    borderRadius: 24,
  },
  sendButtonBackground: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3f51b5',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#3f51b5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  sendIcon: {
    margin: 0,
  },
});

export default MensajesHomeWithTracker;
