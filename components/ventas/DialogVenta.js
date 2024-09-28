import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { Dialog, Portal, Button, TextInput, Provider, IconButton, Text } from 'react-native-paper';
import { useState } from 'react';

import Meteor, { withTracker } from '@meteorrn/core';
import { VentasCollection } from '../collections/collections';

const DialogVenta = ({ visible, hideDialog, data }) => {
    const [precio, setPrecio] = useState();
    const [comentario, setComentario] = useState();
    const [cobrado, setCobrado] = useState();
    const [ganancias, setGanancias] = useState();
    const [admin, setAdmin] = useState();
    const [user, setUser] = useState();
    const [createdAt, setCreatedAt] = useState();

    React.useEffect(() => {
        setAdmin(Meteor.users.findOne(data.adminId))
    }, [data.adminId])

    React.useEffect(() => {
        setUser(Meteor.users.findOne(data.userId))
    }, [data.userId])


    React.useEffect(() => {
        setPrecio(data.precio ? data.precio.toString() : null)
    }, [data.precio])

    React.useEffect(() => {
        setComentario(data.comentario)
    }, [data.comentario])

    React.useEffect(() => {
        setCobrado(data.cobrado ? "true" : "false")
    }, [data.cobrado])

    React.useEffect(() => {
        setGanancias(data.gananciasAdmin ? data.gananciasAdmin.toString() : 0)
    }, [data.gananciasAdmin])


    React.useEffect(() => {
        setCreatedAt(data.createdAt)
    }, [data.createdAt])

    const eliminarVenta = () => {
        data._id ? Meteor.call("eliminarVenta", data._id, (error, result) => {
            error && alert(error.message)
            !error && hideDialog();
        })
            : alert("Reintentelo Nuevamente, no se obtuvo el Id de la venta")
    }


    const handleSavePress = () => {
        // Aquí se manejaría la lógica para guardar los datos
        const formData = {
          precio: Number(precio),
          comentario,
          gananciasAdmin: Number(ganancias)
        };
        
        console.log('Datos guardados:', data._id);
        console.log('Datos guardados:', formData);
        VentasCollection.update(data._id, { $set: formData });
        hideDialog(); // Oculta el diálogo después de guardar
    };
    return (
        <Portal>

            <Dialog visible={visible} onDismiss={hideDialog}>
                <ScrollView>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Dialog.Title style={{ paddingLeft: 10 }} >Ventas</Dialog.Title>
                        <IconButton mode="outlined" style={{ right: 20 }} icon="close" onPress={() => { hideDialog() }} />
                    </View>

                    <Dialog.Content>
                        
                                <TextInput
                                    label="Admin ID"
                                    value={admin && admin.username}
                                    disabled
                                />
                                <TextInput
                                    label="User ID"
                                    value={user && user.username}
                                    disabled
                                />
                                <TextInput
                                    label="Fecha de creación"
                                    value={createdAt && createdAt.toString()}
                                    disabled
                                />
                                <TextInput
                                    label="Precio"
                                    value={precio}
                                    onChangeText={setPrecio}
                                    keyboardType="numeric"
                                />
                                <TextInput
                                    label="Ganancias"
                                    value={ganancias}
                                    onChangeText={setGanancias}
                                    keyboardType="numeric"
                                />
                                <TextInput
                                    multiline={true}
                                    label="Comentario"
                                    value={comentario}
                                    onChangeText={setComentario}
                                />
                    </Dialog.Content>
                    {precio &&
                            comentario &&
                            admin &&
                            user ?
                            <Dialog.Actions style={{ justifyContent: "space-around" }}>
                        <Button icon="close" mode="outlined" onPress={()=>{eliminarVenta()}}>Eliminar</Button>
                        <Button icon="content-save-outline" mode="outlined" onPress={handleSavePress}>Guardar</Button>
                    </Dialog.Actions>
                           :<Text></Text>}
                </ScrollView>

            </Dialog>
        </Portal>
    );
};

export default DialogVenta;
