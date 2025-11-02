/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, { useEffect, useRef, useState } from 'react';
// import type {Node} from 'react';
import {
  ActivityIndicator,
  Avatar,
  Badge,
  Button,
  Chip,
  Divider,
  IconButton,
  List,
  Menu,
  Modal,
  Portal,
  Surface,
  Switch,
  Text,
  TextInput,
  Title,
  Icon,
  Searchbar,
} from 'react-native-paper';
import { SegmentedButtons } from 'react-native-paper';
// import * as axios from 'axios';
import Meteor, { Mongo, withTracker } from '@meteorrn/core';
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  View,
  SafeAreaView
} from 'react-native';
import { Logs, VentasCollection } from '../collections/collections';

import { DataTable, Dialog } from 'react-native-paper';
import DialogVenta from './DialogVenta';


const { width: screenWidth } = Dimensions.get('window');
const { height: screenHeight } = Dimensions.get('window');

const optionsPerPage = [50, 75, 100];

class MyApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      page: 0,
      itemsPerPage: optionsPerPage[0],
      showDialog: false,
      data: null,
      // Filtros
      searchQuery: '',
      selectedType: 'TODOS',
      selectedAdmin: 'TODOS',
      selectedUser: 'TODOS',
      selectedPago: 'TODOS', // TODOS, PAGADO, PENDIENTE
      filteredVentas: [],
    };
  }

  componentDidUpdate(prevProps) {
    // Actualizar ventas filtradas cuando cambian los datos
    if (prevProps.ventas !== this.props.ventas) {
      this.applyFilters();
    }
  }

  applyFilters = () => {
    const { ventas } = this.props;
    const { searchQuery, selectedType, selectedAdmin, selectedUser, selectedPago } = this.state;

    let filtered = [...ventas];

    // Filtro por búsqueda (comentario, type, admin, user, precio)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(venta => 
        venta.comentario?.toLowerCase().includes(query) ||
        venta.type?.toLowerCase().includes(query) ||
        venta.adminusername?.toLowerCase().includes(query) ||
        venta.userusername?.toLowerCase().includes(query) ||
        venta.precio?.toString().includes(query)
      );
    }

    // Filtro por Type
    if (selectedType !== 'TODOS') {
      filtered = filtered.filter(venta => venta.type === selectedType);
    }

    // Filtro por Admin
    if (selectedAdmin !== 'TODOS') {
      filtered = filtered.filter(venta => venta.adminusername === selectedAdmin);
    }

    // Filtro por User
    if (selectedUser !== 'TODOS') {
      filtered = filtered.filter(venta => venta.userusername === selectedUser);
    }

    // Filtro por Estado de Pago
    if (selectedPago !== 'TODOS') {
      const isPagado = selectedPago === 'PAGADO';
      filtered = filtered.filter(venta => venta.cobrado === isPagado);
    }

    this.setState({ filteredVentas: filtered, page: 0 });
  };

  handleSearchChange = (query) => {
    this.setState({ searchQuery: query }, () => {
      this.applyFilters();
    });
  };

  handleFilterChange = (filterType, value) => {
    this.setState({ [filterType]: value }, () => {
      this.applyFilters();
    });
  };

  clearAllFilters = () => {
    this.setState({
      searchQuery: '',
      selectedType: 'TODOS',
      selectedAdmin: 'TODOS',
      selectedUser: 'TODOS',
      selectedPago: 'TODOS',
      page: 0,
    }, () => {
      this.applyFilters();
    });
  };

  getUniqueValues = (field) => {
    const { ventas } = this.props;
    const values = ventas.map(venta => venta[field]).filter(Boolean);
    return ['TODOS', ...new Set(values)];
  };

  render() {
    const { user, ready, navigation, myTodoTasks, ventas} = this.props;
    const { 
      page, 
      itemsPerPage, 
      showDialog, 
      data, 
      filteredVentas, 
      searchQuery, 
      selectedType, 
      selectedAdmin, 
      selectedUser,
      selectedPago 
    } = this.state;

    const dataToDisplay = filteredVentas.length > 0 || searchQuery || selectedType !== 'TODOS' || selectedAdmin !== 'TODOS' || selectedUser !== 'TODOS' || selectedPago !== 'TODOS'
      ? filteredVentas 
      : ventas;

    const from = page * itemsPerPage;
    const to = Math.min((page + 1) * itemsPerPage, dataToDisplay.length);

    const backgroundStyle = {
      minHeight: (screenHeight - 80),
    };
    const moment = require('moment');

    // Obtener valores únicos para filtros
    const types = this.getUniqueValues('type');
    const admins = this.getUniqueValues('adminusername');
    const users = this.getUniqueValues('userusername');
    const estadosPago = ['TODOS', 'PAGADO', 'PENDIENTE'];

    // Contador de filtros activos
    const activeFiltersCount = [
      searchQuery,
      selectedType !== 'TODOS',
      selectedAdmin !== 'TODOS',
      selectedUser !== 'TODOS',
      selectedPago !== 'TODOS',
    ].filter(Boolean).length;

    const mostrarDialog = () => {
      this.setState({ showDialog: true })
    }
    const cerrarDialog = () => {
      this.setState({ showDialog: false })
    }

    return (
      <ScrollView style={backgroundStyle}>
        <Surface >
          {data && <DialogVenta visible={showDialog} hideDialog={cerrarDialog} data={data}></DialogVenta>}

          {ready ? (
            <>
              {/* Barra de búsqueda */}
              <View style={styles.searchContainer}>
                <Searchbar
                  placeholder="Buscar ventas..."
                  onChangeText={this.handleSearchChange}
                  value={searchQuery}
                  style={styles.searchbar}
                  icon="magnify"
                  clearIcon="close"
                />
              </View>

              {/* Filtros con Chips */}
              <View style={styles.filtersContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {/* Filtro Type */}
                  <View style={styles.filterGroup}>
                    <Text style={styles.filterLabel}>Tipo:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {types.map(type => (
                        <Chip
                          key={type}
                          selected={selectedType === type}
                          onPress={() => this.handleFilterChange('selectedType', type)}
                          style={[
                            styles.chip,
                            selectedType === type && styles.chipSelected
                          ]}
                          textStyle={selectedType === type && styles.chipTextSelected}
                          icon={selectedType === type ? 'check-circle' : undefined}
                        >
                          {type}
                        </Chip>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Filtro Admin */}
                  <View style={styles.filterGroup}>
                    <Text style={styles.filterLabel}>Admin:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {admins.map(admin => (
                        <Chip
                          key={admin}
                          selected={selectedAdmin === admin}
                          onPress={() => this.handleFilterChange('selectedAdmin', admin)}
                          style={[
                            styles.chip,
                            selectedAdmin === admin && styles.chipSelected
                          ]}
                          textStyle={selectedAdmin === admin && styles.chipTextSelected}
                          icon={selectedAdmin === admin ? 'check-circle' : undefined}
                        >
                          {admin}
                        </Chip>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Filtro User */}
                  <View style={styles.filterGroup}>
                    <Text style={styles.filterLabel}>Usuario:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {users.map(userItem => (
                        <Chip
                          key={userItem}
                          selected={selectedUser === userItem}
                          onPress={() => this.handleFilterChange('selectedUser', userItem)}
                          style={[
                            styles.chip,
                            selectedUser === userItem && styles.chipSelected
                          ]}
                          textStyle={selectedUser === userItem && styles.chipTextSelected}
                          icon={selectedUser === userItem ? 'check-circle' : undefined}
                        >
                          {userItem}
                        </Chip>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Filtro Estado de Pago */}
                  <View style={styles.filterGroup}>
                    <Text style={styles.filterLabel}>Estado:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {estadosPago.map(estado => (
                        <Chip
                          key={estado}
                          selected={selectedPago === estado}
                          onPress={() => this.handleFilterChange('selectedPago', estado)}
                          style={[
                            styles.chip,
                            selectedPago === estado && styles.chipSelected
                          ]}
                          textStyle={selectedPago === estado && styles.chipTextSelected}
                          icon={selectedPago === estado ? 'check-circle' : undefined}
                        >
                          {estado}
                        </Chip>
                      ))}
                    </ScrollView>
                  </View>
                </ScrollView>
              </View>

              {/* Indicador de filtros activos y botón limpiar */}
              {activeFiltersCount > 0 && (
                <View style={styles.activeFiltersContainer}>
                  <Chip 
                    icon="filter" 
                    style={styles.activeFiltersChip}
                    textStyle={styles.activeFiltersText}
                  >
                    {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} activo{activeFiltersCount > 1 ? 's' : ''}
                  </Chip>
                  <Button 
                    mode="text" 
                    onPress={this.clearAllFilters}
                    icon="filter-remove"
                    compact
                  >
                    Limpiar
                  </Button>
                </View>
              )}

              {/* Contador de resultados */}
              <View style={styles.resultsCounter}>
                <Text style={styles.resultsText}>
                  Mostrando {dataToDisplay.length} de {ventas.length} ventas
                </Text>
              </View>

              {/* Tabla de datos */}
              <DataTable>
                <DataTable.Header>
                  <DataTable.Title>Type</DataTable.Title>
                  <DataTable.Title>Admin</DataTable.Title>
                  <DataTable.Title>User</DataTable.Title>
                  <DataTable.Title sortDirection='descending'>Fecha</DataTable.Title>
                  <DataTable.Title>Pago</DataTable.Title>
                </DataTable.Header>

                {dataToDisplay.length > 0 ? (
                  dataToDisplay.map((element, index) => {
                    return index >= from && index < to && (
                      <DataTable.Row 
                        key={element._id}
                        onPress={() => {
                          this.setState({ data: element });
                          mostrarDialog();
                        }}
                      >
                        <DataTable.Cell>{element.type}</DataTable.Cell>
                        <DataTable.Cell>{element.adminusername}</DataTable.Cell>
                        <DataTable.Cell>{element.userusername}</DataTable.Cell>
                        <DataTable.Cell>
                          {moment(new Date(element.createdAt)).format('DD-MM-YY')}
                        </DataTable.Cell>
                        <DataTable.Cell>
                          <View style={{ flexDirection: "column", alignItems: "center" }}>
                            <IconButton
                              icon={element && element.cobrado ? "cart-check" : "cart-arrow-down"}
                              mode='contained'
                              color={element && element.cobrado ? 'green' : 'red'}
                              onPress={() => {
                                Meteor.call("changeStatusVenta", element._id, (error, result) => {
                                  error && alert(error.message)
                                })
                              }}
                              size={30} 
                            />
                          </View>
                        </DataTable.Cell>
                      </DataTable.Row>
                    );
                  })
                ) : (
                  <View style={styles.emptyState}>
                    <IconButton icon="filter-remove" size={48} />
                    <Text style={styles.emptyText}>No se encontraron ventas con los filtros aplicados</Text>
                    <Button mode="outlined" onPress={this.clearAllFilters} style={styles.emptyButton}>
                      Limpiar filtros
                    </Button>
                  </View>
                )}

                <DataTable.Pagination
                  page={page}
                  numberOfPages={Math.ceil(dataToDisplay.length / itemsPerPage)}
                  onPageChange={(page) => this.setState({ page })}
                  label={`${from + 1}-${to} of ${dataToDisplay.length}`}
                  numberOfItemsPerPageList={optionsPerPage}
                  numberOfItemsPerPage={itemsPerPage}
                  onItemsPerPageChange={item => this.setState({ itemsPerPage: item })}
                  selectPageDropdownLabel={'Rows per page'}
                />
                <Text></Text>
              </DataTable>
            </>
          ) : (
            <Surface>
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3f51b5" />
              </View>
            </Surface>
          )}
        </Surface>
      </ScrollView>
    )
  }
}

const VentasList = withTracker(navigation => {
  let ventas = [];
  //  console.log(user.user)
  const handle2 = Meteor.subscribe('ventas', {}, { sort: { createdAt: -1 }, limit: 200 }).ready();
  const usersSubs = Meteor.subscribe("user",{},{fields:{_id:1, username: 1}}).ready();
  const myTodoTasks = VentasCollection.find({}, { sort: { createdAt: -1 }, limit: 200 }).fetch();
  //  console.log(myTodoTasks);

  handle2 && myTodoTasks.length > 0 && myTodoTasks.map((element, index) => {
    let userusername = usersSubs ? Meteor.users.findOne(element.userId)?.username : "";
    let adminusername = usersSubs ? Meteor.users.findOne(element.adminId)?.username : "";
    
  ventas.push({
      _id: element._id,
      type: element.type,
      userId: element.userId,
      adminId: element.adminId,
      userusername: userusername ? userusername : "Desconocido",
      adminusername: element.adminId != "SERVER" ? adminusername : "SERVER" ,
      comentario: element.comentario,
      precio:element.precio,
      gananciasAdmin: element.gananciasAdmin,
      createdAt: new Date(element.createdAt),
      cobrado: element.cobrado
    });  
  });

  return {
    navigation,
    myTodoTasks,
    ventas,
    ready: handle2 && usersSubs,
  };
})(MyApp);

// var ScreenHeight = Dimensions.get('window').height;
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 30, backgroundColor: '#fff' },
  head: { height: 40, backgroundColor: '#f1f8ff' },
  text: { margin: 6 },
  // Estilos para filtros
  searchContainer: {
    padding: 12,
    backgroundColor: '#fff',
  },
  searchbar: {
    elevation: 2,
    borderRadius: 8,
  },
  filtersContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f5f5f5',
  },
  filterGroup: {
    marginRight: 16,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
    marginLeft: 4,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: '#3f51b5',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#E8EAF6',
  },
  activeFiltersChip: {
    backgroundColor: '#3f51b5',
  },
  activeFiltersText: {
    color: '#fff',
    fontWeight: '600',
  },
  resultsCounter: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  resultsText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    flexDirection: 'column',
    height: screenHeight - 80,
    justifyContent: 'center',
  },
});

export default VentasList;
