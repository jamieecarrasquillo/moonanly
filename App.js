import React, { useState, useEffect } from "react";
import { ExpoWebGLRenderingContext, GLView } from "expo-gl";
import { loaderClassForExtension, Renderer, TextureLoader } from "expo-three";
import { CalendarList } from "react-native-calendars";
import { Text, View, SafeAreaView, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  AmbientLight,
  BoxBufferGeometry,
  Fog,
  GridHelper,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PointLight,
  Scene,
  SpotLight,
} from "three";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils";
import {
  getMoonPhase,
  mapToPhase,
  mapPhaseToString,
  dateStringPlus,
} from "./utils/moonPhase";
// import OrbitControlsView from "expo-three-orbit-controls";

global.THREE = global.THREE || THREE;

let FS = `uniform sampler2D textureMap;
    uniform sampler2D normalMap;

    varying vec2 vUv;
    varying mat3 tbn;
    varying vec3 vLightVector;

    void main() {
        vec3 normalCoordinate = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;

        vec3 normal = normalize(tbn * normalCoordinate.rgb);

        float intensity = max(0.07, dot(normal, vLightVector));
        vec4 lighting = vec4(intensity, intensity, intensity, 1.0);

        gl_FragColor = texture2D(textureMap, vUv) * lighting;
    }`;

let VS = `attribute vec4 tangent;

    uniform vec2 uvScale;
    uniform vec3 lightPosition;

    varying vec2 vUv;
    varying mat3 tbn;
    varying vec3 vLightVector;

    void main() {
        vUv = uvScale * uv;

        vec3 vNormal = normalize(normalMatrix * normal);
        vec3 vTangent = normalize( normalMatrix * tangent.xyz );
        vec3 vBinormal = normalize(cross( vNormal, vTangent ) * tangent.w);
        tbn = mat3(vTangent, vBinormal, vNormal);

        vec4 lightVector = viewMatrix * vec4(lightPosition, 1.0);
        vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
        vLightVector = normalize(lightVector.xyz - modelViewPosition.xyz);

        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;

const light = {
  speed: 0.1,
  distance: 1000,
  position: new THREE.Vector3(0, 60, 70),
  orbit: function (center, time) {
    this.position.x = (center.x + this.distance) * Math.sin(time * -this.speed);

    this.position.z = (center.z + this.distance) * Math.cos(time * this.speed);
  },
};

let clock;

export default function App() {
  const todaysDate =
    new Date().toISOString().slice(0, 8) + new Date().getDate();
  const markedDate = "2021-01-10";
  const endMarkedDate = "2021-01-15";

  const [dates, setDates] = useState({
    [todaysDate]: {
      marked: true,
      dotColor: "#fff",
      startingDay: true,
      endingDay: true,
      type: "today",
    },
  });
  const [markingDate, setMarkingDate] = useState({
    // [markedDate]: {
    //   color: "#B1AE91",
    //   startingDay: true,
    //   type: "thatDay",
    // },
    // [endMarkedDate]: {
    //   color: "#B1AE91",
    //   endingDay: true,
    //   type: "thatDay",
    // },
  });
  const [phase, setPhase] = useState(0);
  const [phaseString, setPhaseString] = useState("");

  useEffect(() => {
    let moonPhaseNumber = getMoonPhase(new Date());
    let moonPhaseString = mapPhaseToString(moonPhaseNumber);
    let phaseToOrbit = mapToPhase(moonPhaseNumber);

    setPhase(phaseToOrbit);
    setPhaseString(moonPhaseString);
  });

  function monthlyCount(day) {
    let markingKeyDateArr = Object.keys(markingDate);
    let count = 0;
    day = day.slice(0, -3);

    for (let i = 0; i < markingKeyDateArr.length; i++) {
      if (markingKeyDateArr[i].includes(day)) {
        count++;
      }
    }
    console.log("count", count);
    console.log("marked", markingKeyDateArr);

    return count;
  }

  function montlyClear(day) {
    let markingKeyDateArr = Object.keys(markingDate);
    day = day.slice(0, -3);
    //2020-01-25
    //2020-01

    markingKeyDateArr = markingKeyDateArr.filter((date) => {
      return date.includes(day);
    });

    let newMarkings = { ...markingDate };
    markingKeyDateArr.forEach((date) => {
      delete newMarkings[date];
    });
    setMarkingDate(newMarkings);
  }

  function addDatesInBetween(markingDates) {
    const daysToAdd = {};

    for (const date in markingDates) {
      if (!markingDates[date].startingDay) continue;
      const startingDay = date;
      const yearAndMonth = date.slice(0, -3);

      // find endingDate for month
      let endingDay;
      for (const date in markingDates) {
        if (!markingDates[date].endingDay) continue;
        if (date.includes(yearAndMonth)) endingDay = date;
      }
      if (!endingDay) break;

      let i = dateStringPlus(startingDay);
      while (i !== endingDay) {
        daysToAdd[i] = {
          color: "#B1AE91",
        };
        i = dateStringPlus(i);
      }
    }

    return {
      ...markingDates,
      ...daysToAdd,
    };
  }

  return (
    <View style={{ flex: 1, backgroundColor: "rgba(191,128,129,1)" }}>
      <SafeAreaView style={style.safearea}>
        <View style={{ flex: 1 }}>
          <GLView
            style={{ flex: 1 }}
            onContextCreate={(gl) => {
              const renderer = new Renderer({
                gl,
                antialias: true,
                alpha: true,
              });
              renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);

              const scene = new THREE.Scene();
              const camera = new THREE.PerspectiveCamera(
                35,
                gl.drawingBufferWidth / gl.drawingBufferHeight,
                1,
                65536
              );
              camera.position.set(0, 0, 400);

              const geometry = new THREE.SphereBufferGeometry(100, 50, 50);

              const textureMap = new TextureLoader().load(
                require("./moon.jpg")
              );
              console.log(textureMap);
              const normalMap = new TextureLoader().load(
                require("./normal.jpg")
              );
              const material = new THREE.ShaderMaterial({
                uniforms: {
                  lightPosition: {
                    type: "v3",
                    value: light.position,
                  },
                  textureMap: {
                    type: "t",
                    value: textureMap,
                  },
                  normalMap: {
                    type: "t",
                    value: normalMap,
                  },
                  uvScale: {
                    type: "v2",
                    value: new THREE.Vector2(1.0, 1.0),
                  },
                },
                vertexShader: VS,
                fragmentShader: FS,
              });

              const sphere = new THREE.Mesh(geometry, material);
              BufferGeometryUtils.computeTangents(geometry);
              scene.add(sphere);

              clock = new THREE.Clock();

              const animate = function () {
                requestAnimationFrame(animate);

                sphere.rotation.y += 0.001;

                // 0 - full moon (full white)
                // 25 - new moon (black)
                light.orbit(sphere.position, phase);

                renderer.render(scene, camera);
                gl.endFrameEXP();
              };

              animate();
            }}
          />
          <Text style={style.phasetext}>{phaseString}</Text>
        </View>
      </SafeAreaView>
      <View
        style={{
          height: 600,
          backgroundColor: "rgba(191,128,129,1)",
        }}
      >
        <View
          style={{
            width: "100%",
            position: "absolute",
            top: 0,
            height: 100,
            zIndex: 1000,
            background: "linear-gradient(#e66465, #9198e5)",
          }}
        >
          <LinearGradient
            colors={["rgba(191,128,129,1)", "rgba(191,128,129,0)"]}
            style={{ width: "100%", height: "100%" }}
          />
        </View>
        <CalendarList
          markingType={"period"}
          onDayPress={(day) => {
            let count = monthlyCount(day.dateString);
            if (count < 1) {
              setMarkingDate({
                ...markingDate,
                [day.dateString]: {
                  color: "#B1AE91",
                  startingDay: true,
                  type: "thatDay",
                },
              });
            } else if (count < 2) {
              setMarkingDate({
                ...markingDate,
                [day.dateString]: {
                  color: "#B1AE91",
                  endingDay: true,
                  type: "thatDay",
                },
              });
            } else {
              montlyClear(day.dateString);
            }
          }}
          theme={{
            calendarBackground: "rgba(191,128,129,1)",
            selectedDayBackgroundColor: "#C96480",
            todayTextColor: "#ffffff",
            dayTextColor: "#ffffff",
            monthTextColor: "#ffffff",
            textSectionTitleColor: "#fff",
            textDayFontSize: 18,
            textMonthFontSize: 18,
            textDayHeaderFontSize: 15,
          }}
          pastScrollRange={3}
          futureScrollRange={3}
          scrollEnabled={true}
          showScrollIndicator={true}
          markedDates={{ ...dates, ...addDatesInBetween(markingDate) }}
        />
      </View>
    </View>
  );
}

const style = StyleSheet.create({
  safearea: {
    flex: 1,
  },
  phasetext: {
    fontSize: 14,
    fontFamily: "GillSans-Italic",
    textAlign: "right",
    position: "absolute",
    bottom: 10,
    right: 10,
    zIndex: 1000,
    color: "rgba(255,255,255,0.3)",
  },
});
