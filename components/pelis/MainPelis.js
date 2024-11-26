import React from 'react';
import {
  View,
  FlatList,
  Image,
  TouchableOpacity,
  TouchableHighlight,
  StyleSheet,
} from 'react-native';
import {Appbar, Avatar, Button, Card, Text} from 'react-native-paper';
import {PelisRegister} from '../collections/collections';
import Meteor, {Mongo, withTracker} from '@meteorrn/core';
import CardPeli from './Card';

const LeftContent = props => <Avatar.Icon {...props} icon="folder" />;
class App extends React.Component {
  componentDidMount() {
    console.log('componentDidMount');
    // console.log(this.flatListRef.current);
    // this.flatListRef.current?.focus();
    // Orientation.lockToPortrait();
    console.log('componentDidMount');
    this.setState = {
      data: this.props.pelis,
      isReady: this.props.ready,
    };
  }

  componentWillUnmount() {
    // console.log('componentWillUnmount');
    // Orientation.unlockAllOrientations();
    this.state = {
      data: [],
      isReady: false,
    };
  }

  componentDidUpdate(prevProps) {
    // console.log('componentDidUpdate');
    // console.log('this.props.pelis', this.props.pelis);
    // console.log('isReady', this.props.ready);
  }

  constructor(props) {
    // const handle = Meteor.subscribe('pelis');
    // const myTodoTasks = PelisRegister.find({}).fetch();
    // console.log(props.myTodoTasks);
    super(props);
    this.flatListRef = React.createRef();
    this.state = {
      data: [],
      isReady: false,
    };

    // console.log('props', this.state);
    // const isDarkMode = useColorScheme() === 'dark';
    // const [data, setData] = ;
    // const [isLoading, setLoading] = useState(true);
    // const carouselRef = useRef(null);
  }

  render() {
    const {navigation, ready, pelis, clasificacion} = this.props;
    // console.log('render', ready, pelis, clasificacion);

    return (
      <>
        {ready && pelis && pelis.length > 0 && (
          <View
            style={{
              paddingBottom: 50,
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              maxHeight: 230,
            }}>
            <View style={{width: '100%', padding:10}}>
              <Text  minimumFontScale={10}>
                {clasificacion.toUpperCase()}
              </Text>
            </View>
            <FlatList
              ref={this.flatListRef}
              focusable={true}
              accessible={true}
              data={pelis}
              renderItem={({item}) => (
                <CardPeli item={item} navigation={navigation} />
              )}
              style={{minWidth: '100%'}}
              horizontal={true}
              scrollEnabled={true}
              keyExtractor={item => item._id} // Asegúrate de tener una key única
              initialNumToRender={5}
              maxToRenderPerBatch={10}
              removeClippedSubviews={true}
            />
          </View>
        )}
      </>
    );
  }
}

const MainPelis = withTracker(({navigation, clasificacion, search}) => {
  let ready = Meteor.subscribe(
    'pelis',
    clasificacion == "All"?{}:{clasificacion: clasificacion},
    {
      fields: {
        _id: 1,
        nombrePeli: 1,
        urlPeliHTTPS: 1,
        clasificacion: 1,
        subtitulo: 1,
        year:1,
        vistas:1,
        extension:1

      },
    },
  ).ready();
  let pelis = ready
    ? PelisRegister.find(
        search
          ? clasificacion == 'All'
            ? {
                $or: [
                  {nombrePeli: {$regex: search, $options: 'i'}}, // 'i' hace que sea insensible a mayúsculas/minúsculas
                  {year: {$regex: search, $options: 'i'}}, // 'i' hace que sea insensible a mayúsculas/minúsculas
                  {extension: {$regex: search, $options: 'i'}},
                ],
              }
            : {
                clasificacion: clasificacion,
                $or: [
                  {nombrePeli: {$regex: search, $options: 'i'}}, // 'i' hace que sea insensible a mayúsculas/minúsculas
                  {year: {$regex: search, $options: 'i'}}, // 'i' hace que sea insensible a mayúsculas/minúsculas
                  {extension: {$regex: search, $options: 'i'}},
                ],
              }
          : clasificacion == 'All'
            ? {}
            : {clasificacion: clasificacion},
        {
          fields: {
            _id: 1,
            nombrePeli: 1,
            urlPeliHTTPS: 1,
            subtitulo: 1,
            year: 1,
            vistas: 1,
            extension: 1,
          },
          //limites de la busqueda:100
          
          //ordenar por nombre
          sort: {vistas: -1, year: -1, nombrePeli: 1},
          limit: 100,
        },
      ).fetch()
    : null;

  // console.log('pelis', pelis);
  return {
    navigation,
    pelis,
    ready,
    clasificacion,
  };
})(App);

export default MainPelis;
