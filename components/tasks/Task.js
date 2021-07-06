import Meteor, {withTracker} from '@meteorrn/core';
import {Mensajes} from '../collections/collections'

const TaskMensajes = (myTodoTasks, loading) => {
  //   !loading &&
  //     Meteor.userId() &&
  //     console.log(JSON.stringify(myTodoTasks.fetch()));
  console.log('hola');
};

const Task = async () => {
  const myTodoTasks = await Mensajes.find({});
  console.log(JSON.stringify(myTodoTasks));
};

export default Task;
