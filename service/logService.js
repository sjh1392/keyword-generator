import axios from 'axios';

var session = {};

const loggingService = {

    setup : async() => {
        
        session.id = sessionStorage.getItem("session");
        if(session.id == null){ 
            session.id = await generateGUID();
            sessionStorage.setItem("session", session.id);
            loggingService.sendLog("app-start", "session-setup", session.id);
        }

    },

    sendLog: async (name, data = {}) => {

        try {
            
            console.log('logged', session.id);
            // Replace with your server's logging endpoint
            const endpoint = "http://localhost:3000/api/log";
            const payload = {
                name,
                data,
                session
            };
            
            await axios.get(endpoint, {params: payload});

            console.log("Log sent successfully:", payload);
        } catch (error) {
            console.error("Failed to send log:", error);
        }
    }
};

async function generateGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
  
export default loggingService;