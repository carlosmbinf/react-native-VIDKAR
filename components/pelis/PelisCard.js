import React, {useState} from 'react';
import {Avatar, Button, Card, Title, Paragraph} from 'react-native-paper';
import {
  View,
  Linking,
  Text,
  ScrollView,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
  Dimensions,
  Platform,
  ImageBackground,
} from 'react-native';
import Modal from 'react-native-modal';
import {
  Colors,
  DebugInstructions,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';
import Player from '../video/Video';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const LeftContent = props => <Avatar.Icon {...props} icon="folder" />;

const PelisCard = item => {
  const [url, setUrl] = useState('');
  const [isFull, setIsFull] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isDarkMode, setIsDarkMode] = useColorScheme();

  const itemlocal = item.item;
  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };
  return (
    <View>
      <Modal
        // animationType='fade'
        style={{width: '100%', margin: 0}}
        isVisible={isModalVisible}
        onSwipeComplete={() => setModalVisible(false)}
        // swipeDirection="down"
        // coverScreen={true}
        transparent={true}
        customBackdrop={
          <View
            onTouchEnd={() => {
              setModalVisible(false);
            }}
            style={{backgroundColor: 'black', flex: 1}}
          />
        }>
        <View
          style={{
            height: 300,
            marginTop: 'auto',
            backgroundColor: '#3f4b5b',
            borderRadius: 30,
            marginBottom: 10,
            marginLeft: 10,
            marginRight: 10,
            alignItems: 'center',
            padding: 10,
          }}>
          {/* <Player item={itemlocal}/> */}
          <View
            style={{
              marginBottom: 10,
              width: '100%',
              borderStyle: 'solid',
              borderWidth: 1,
              borderRadius: 20,
              padding: 10,
              alignItems: 'center',
              backgroundColor: '#3f51b5',
              flexDirection: 'row',
            }}>
            <View style={{width: '90%', alignItems: 'center'}}>
              <Text style={{color: 'white'}}>{itemlocal.nombrePeli}</Text>
            </View>
            <View style={{width: '10%'}}>
              <MaterialCommunityIcons
                onPress={() => {
                  setModalVisible(false);
                }}
                name="close"
                color={'white'}
                size={26}
              />
            </View>
          </View>
          <View
            style={{
              flexDirection: 'row',
              height: 150,
              width: '100%',
              borderStyle: 'solid',
              borderWidth: 1,
              borderRadius: 20,
              padding: 10,
              marginBottom: 10,
            }}>
            <View style={{width: '30%', height: '100%'}}>
              <Card.Cover
                style={{height: '100%', borderRadius: 10}}
                source={{
                  uri: itemlocal.urlBackground,
                }}></Card.Cover>
            </View>
            <View
              style={{
                borderStyle: 'solid',
                borderWidth: 1,
                borderRadius: 10,
                padding: 10,
                marginLeft: 10,
                marginRight: 10,
                height: '100%',
                width: '67%',
              }}>
              <ScrollView contentInsetAdjustmentBehavior="automatic">
                <View>
                  <Text style={{color: 'white'}}>
                    {itemlocal.descripcion}
                    {/* {JSON.stringify(item.navigation.navigation.navigate('Prueba'))} */}
                  </Text>
                </View>
              </ScrollView>
            </View>
          </View>
          <View
            style={{
              flexDirection: 'row',
              // height: 125,
              width: '100%',
              borderStyle: 'solid',
              borderWidth: 1,
              borderRadius: 20,
              padding: 10,
            }}>
            <Button
              onPress={() => {
                // Linking.openURL(
                //   'https://srv5119-206152.vps.etecsa.cu/pelis/' + itemlocal._id,
                // );
                // item.navigation.navigation.navigate('Video');
                // console.log(item)
                item.navigation.navigationGeneral.navigate('Video', item);
                setModalVisible(false);
              }}
              title="Learn More"
              color="#3f51b5"
              // loading={true}
              // dark
              mode="contained"
              style={{borderRadius: 10, width: '100%'}}
              accessibilityLabel="Learn more about this purple button">
              Ver Película
            </Button>
          </View>
        </View>
      </Modal>

      <View style={{width: '100%', padding: 10}}>
        <Card
          elevation={10}
          style={{borderRadius: 20}}
          onPress={
            () => setModalVisible(true)
            // Linking.openURL(
            //   'https://srv5119-206152.vps.etecsa.cu/pelis/' + itemlocal._id,
            // )
          }>
          {/* <Card.Title title="Card Title" subtitle="Card Subtitle" left={LeftContent} /> */}
          <Card.Content>
            <Title style={{color: 'red'}}>{itemlocal.nombrePeli}</Title>
            <Paragraph>{itemlocal.tamano}MB</Paragraph>
            <Card.Cover
              source={{
                uri: itemlocal.urlBackground,
              }}></Card.Cover>
          </Card.Content>

          {/* <Card.Actions>
      <Button>Cancel</Button>
      <Button>Ok</Button>
    </Card.Actions> */}
        </Card>
      </View>
    </View>
  );
};
const styles = StyleSheet.create({
  modal: {backgroundColor: 'red', height: 300, bottom: 0, position: 'absolute'},
});
export default PelisCard;
