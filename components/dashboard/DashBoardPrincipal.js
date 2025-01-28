import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Meteor, {Mongo, withTracker} from '@meteorrn/core';
import {
    LineChart,
    BarChart,
    PieChart,
    ProgressChart,
    ContributionGraph,
    StackedBarChart
} from "react-native-chart-kit";

const DashBoardPrincipal = ({type}) => {
    const [width, setWidth] = useState([]);
    const [dimensions, setDimensions] = useState([]);
    const [x, setX] = useState([]);
    const [y, setY] = useState([]);
    const [height, setHeight] = useState([]);
        const result = new Promise((resolve, reject) => {
            
      });

      useEffect(() => {
        Meteor.call('getDatosDashboardByUser', type, null, async (error, result) => {
            if (error) {
                console.log("error", error);
            } else {
                console.log("result", result);
                result && await setY( result.map((item,index) => Number(item.VPN)));
                 result && await setX( result.filter((item,index) => index%2 == 0).map((item,index) => item.name.replace(/:00/g, "")));
                console.log("x", x);
                console.log("y", y);
            }
            });
      }, []);
    // console.log("data", data);
    // const data = Array.from({ length: 6 }, (_, index) => ({
    //     // Starting at 1 for Jaunary
    //     month: index + 1,
    //     // Randomizing the listen count between 100 and 50
    //     listenCount: Math.floor(Math.random() * (100 - 50 + 1)) + 50,
    // }))

    //actualizar width si cambia la rotacion del dispositivo
    

    // useEffect(() => {
    //     console.log("DATA:" + JSON.stringify(data));
    // }, [data]);
    useEffect(() => {
        setWidth(Dimensions.get("window").width);
            setHeight(Dimensions.get("window").height);
        const handleDimensionChange = ({ window }) => {
            setWidth(window.width);
            setHeight(window.height);
        };
    
        // Añade el listener para el evento de cambio de dimensiones
        const subscription = Dimensions.addEventListener('change', handleDimensionChange);
        // Limpia el listener al desmontar el componente
        return () => subscription?.remove();
      }, []);

    return (
        x.length > 0 && y.length > 0 && <View style={{padding: "2%"}}>
            <Text>Calculo de la Grafica: {type}</Text>
            <LineChart
                data={{
                    labels: x,
                    datasets: [
                        {
                            data: y,
                            color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`, // optional
                            strokeWidth: 2 // optional
                        }
                    ]
                }}
                // verticalLabelRotation={90}
                width={width-width*0.04} // from react-native
                height={220}
                segments={5}                
                // horizontalLabelRotation={30}
                // yAxisLabel="$"
                yAxisSuffix=" GB"
                yAxisInterval={5} // optional, defaults to 1
                fromZero={true}
                chartConfig={{
                    backgroundColor: "#2a323d",
                    backgroundGradientFrom: "#2a323d",
                    backgroundGradientTo: "#2a323d",
                    decimalPlaces: 0, // optional, defaults to 2dp
                    color: (opacity) => `rgba(255, 255, 255, ${opacity})`,
                    labelColor: (opacity) => `rgba(255, 255, 255, ${opacity})`,
                    style: {
                        borderRadius: 16
                    },
                    propsForDots: {
                        r: "3",
                        strokeWidth: "1",
                        stroke: "#ffa726"
                    }
                }}
                bezier
                style={{
                    marginVertical: 8,
                    borderRadius: 16
                }}
            />
        </View>
    );
};

// const DashBoardPrincipal = withTracker( async (navigation) => {
//     var y;
//     var x
//     var tiempo = "HORA";


//   return {
//     data:result
//   };
// })(App);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        fontSize: 20,
        color: 'black',
    },
});

export default DashBoardPrincipal;