import Meteor, {withTracker} from '@meteorrn/core';

const TaskMensajes = (myTodoTasks, loading) => {
  //   !loading &&
  //     Meteor.userId() &&
  //     console.log(JSON.stringify(myTodoTasks.fetch()));
  console.log('hola');
};

const Task = async () => {
  const myTodoTasks = await Meteor.Collection('mensajes').find({});
  console.log(JSON.stringify(myTodoTasks));
};

export default Task;
