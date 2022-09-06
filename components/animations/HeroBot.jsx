import React, { useEffect } from "react";
import Rive from 'rive-react-native';

export default function HeroBot() {
  return <Rive
      url="https://cdn.rive.app/animations/vehicles.riv"
      style={{width: 400, height: 400}}
  />;
}