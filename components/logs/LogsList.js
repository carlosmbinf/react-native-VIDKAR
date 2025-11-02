/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, { useRef, useEffect, useState } from 'react';
// import type {Node} from 'react';
import {
  Avatar,
  IconButton,
  List,
  Text,
  Provider as PaperProvider,
  Switch,
  Title,
  TextInput,
  Badge,
  Menu,
  Divider,
  Button,
  Modal,
  Surface,
  ActivityIndicator,
  Chip,
  Searchbar,
} from 'react-native-paper';
// import * as axios from 'axios';
import Meteor, { Mongo, withTracker } from '@meteorrn/core';
import {
  ScrollView,
  StyleSheet,
  View,
  Dimensions,
  Alert,
} from 'react-native';
import { Logs } from '../collections/collections';

import { DataTable } from 'react-native-paper';


const { width: screenWidth } = Dimensions.get('window');
const { height: screenHeight } = Dimensions.get('window');

const optionsPerPage = [50, 75, 100];

class MyApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      page: 0,
      itemsPerPage: optionsPerPage[0],
      // Filtros
      searchQuery: '',
      selectedType: 'TODOS',
      selectedAdmin: 'TODOS',
      selectedUser: 'TODOS',
      filteredLogs: [],
    };
  }

  componentDidUpdate(prevProps) {
    // Actualizar logs filtrados cuando cambian los datos
    if (prevProps.myTodoTasks !== this.props.myTodoTasks) {
      this.applyFilters();
    }
  }

  applyFilters = () => {
    const { myTodoTasks } = this.props;
    const { searchQuery, selectedType, selectedAdmin, selectedUser } = this.state;

    let filtered = [...myTodoTasks];

    // Filtro por búsqueda (mensaje, type, admin, user)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log => 
        log.message?.toLowerCase().includes(query) ||
        log.type?.toLowerCase().includes(query) ||
        log.adminusername?.toLowerCase().includes(query) ||
        log.userusername?.toLowerCase().includes(query)
      );
    }

    // Filtro por Type
    if (selectedType !== 'TODOS') {
      filtered = filtered.filter(log => log.type === selectedType);
    }

    // Filtro por Admin
    if (selectedAdmin !== 'TODOS') {
      filtered = filtered.filter(log => log.adminusername === selectedAdmin);
    }

    // Filtro por User
    if (selectedUser !== 'TODOS') {
      filtered = filtered.filter(log => log.userusername === selectedUser);
    }

    this.setState({ filteredLogs: filtered, page: 0 });
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
      page: 0,
    }, () => {
      this.applyFilters();
    });
  };

  getUniqueValues = (field) => {
    const { myTodoTasks } = this.props;
    const values = myTodoTasks.map(log => log[field]).filter(Boolean);
    return ['TODOS', ...new Set(values)];
  };

  render() {
    const { user, ready, navigation, myTodoTasks } = this.props;
    const { 
      page, 
      itemsPerPage, 
      filteredLogs, 
      searchQuery, 
      selectedType, 
      selectedAdmin, 
      selectedUser 
    } = this.state;

    const dataToDisplay = filteredLogs.length > 0 || searchQuery || selectedType !== 'TODOS' || selectedAdmin !== 'TODOS' || selectedUser !== 'TODOS' 
      ? filteredLogs 
      : myTodoTasks;

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

    // Contador de filtros activos
    const activeFiltersCount = [
      searchQuery,
      selectedType !== 'TODOS',
      selectedAdmin !== 'TODOS',
      selectedUser !== 'TODOS',
    ].filter(Boolean).length;

    return (
      <ScrollView style={backgroundStyle}>
        <Surface>
          {ready ? (
            <>
              {/* Barra de búsqueda */}
              <View style={styles.searchContainer}>
                <Searchbar
                  placeholder="Buscar en logs..."
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
                  Mostrando {dataToDisplay.length} de {myTodoTasks.length} registros
                </Text>
              </View>

              {/* Tabla de datos */}
              <DataTable>
                <DataTable.Header>
                  <DataTable.Title>Type</DataTable.Title>
                  <DataTable.Title>Admin</DataTable.Title>
                  <DataTable.Title>User</DataTable.Title>
                  <DataTable.Title sortDirection='descending'>Fecha</DataTable.Title>
                </DataTable.Header>

                {dataToDisplay.length > 0 ? (
                  dataToDisplay.map((element, index) => {
                    return index >= from && index < to && (
                      <DataTable.Row 
                        key={element._id}
                        onPress={() => {
                          Alert.alert(
                            "Datos:",
                            `Admin: ${element.adminusername != null ? element.adminusername : "SERVER"}\n\n` +
                            `Usuario: ${element.userusername}\n\n` +
                            `Fecha: ${moment(new Date(element.createdAt)).format('DD/MM/YYYY=>hh:mm:ss A')}\n\n` +
                            `Mensaje: ${element.message}`
                          );
                        }}
                      >
                        <DataTable.Cell>{element.type}</DataTable.Cell>
                        <DataTable.Cell>{element.adminusername != null ? element.adminusername : "SERVER"}</DataTable.Cell>
                        <DataTable.Cell>{element.userusername}</DataTable.Cell>
                        <DataTable.Cell>
                          {moment(new Date(element.createdAt)).format('DD/MM=>hh:mm:ss A')}
                        </DataTable.Cell>
                      </DataTable.Row>
                    );
                  })
                ) : (
                  <View style={styles.emptyState}>
                    <IconButton icon="filter-remove" size={48} />
                    <Text style={styles.emptyText}>No se encontraron logs con los filtros aplicados</Text>
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
    );
  }
}

const LogsList = withTracker(navigation => {
  let logs = []
  //  console.log(user.user)
  const isPrincipal = Meteor?.user()?.username == "carlosmbinf" ? true : false;

  const handle2 = Meteor.subscribe('logs', isPrincipal ? {} : { $or: [{ userAfectado: Meteor.userId() }, { userAdmin: Meteor.userId() }] }, { sort: { createdAt: -1 }, limit: 100 }).ready();
  const usersSubs = Meteor.subscribe("user",{},{fields:{_id:1, username: 1}}).ready();


  const myTodoTasks = Logs.find(isPrincipal ? {} : { $or: [{ userAfectado: Meteor.userId() }, { userAdmin: Meteor.userId() }] }, { sort: { createdAt: -1 }, limit: 100 }).fetch();

  handle2 && myTodoTasks.map(task => {
    let userusername = usersSubs ? Meteor.users.findOne(task.userAfectado)?.username : "";
    let adminusername = usersSubs ? Meteor.users.findOne(task.userAdmin)?.username : "";
    
    logs.push({
      userusername: userusername ? userusername : "Desconocido",
      adminusername: task.userAdmin != "SERVER" ? adminusername : "SERVER" ,
      _id: task._id,
      createdAt: task.createdAt,
      type: task.type,
      message: task.message,
      userId: task.userAfectado,
      adminId: task.userAdmin,
    });
  })
  //  console.log(myTodoTasks);
  return {
    navigation,
    myTodoTasks : logs,
    ready: handle2 && usersSubs,
  };
})(MyApp);

// var ScreenHeight = Dimensions.get('window').height;
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 30, backgroundColor: '#fff' },
  head: { height: 40, backgroundColor: '#f1f8ff' },
  text: { margin: 6 },
  // Nuevos estilos para filtros
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

export default LogsList;
