import axios from 'axios';
import {logWithTimestamp, logErrorWithTimestamp} from '../utils/util.js';



export const getForms = async () => {
    try {
        const response = await axios.get(`${process.env.BASE_URL}/formspaces`, {
            auth: {
                username: process.env.USER_TC,
                password: process.env.PASSWORD_TC,
            },
            params: {
                tenant: "", // Tenant as query parameter
            },
        });

        // Log the response data
        //console.log('Response:', response.data);
    } catch (error) {
        // Handle errors
        console.error('Error fetching tenants:', error.message);
        if (error.response) {
            console.error('Error details:', error.response.data);
        }
    }
};

export const getFormsById = async (formid) => {
    try {
        const response = await axios.get(`${process.env.BASE_URL}/formspaces/${formid}`, {
            auth: {
                username: process.env.USER_TC,
                password: process.env.PASSWORD_TC,
            },
            params: {
                tenant: "", // Tenant as query parameter
            },
        });

        // Log the response data
        console.log('Response:', response.data);
    } catch (error) {
        // Handle errors
        console.error('Error fetching tenants:', error.message);
        if (error.response) {
            console.error('Error details:', error.response.data);
        }
    }
};

export const getFormSubmision = async (formSpaceId,start,end) => {

    let page = 0; // Empezar en la primera página
    let totalPages = 1; // Inicializamos con un valor ficticio
    const results = []; // Donde almacenaremos todos los datos

    try {
        // Continuamos mientras no se superen las páginas disponibles
        logWithTimestamp(`Fetching data from ${start} to ${end}. FormSpaceID: ${formSpaceId}`);
        while (page <= totalPages) {
            //console.log(`Fetching page ${page}...`);
            
            const response = await axios.get(`${process.env.BASE_URL}/data`, {
                auth: {
                    username: process.env.USER_TC,
                    password: process.env.PASSWORD_TC,
                },
                params: {
                    fsids: formSpaceId, // FormSpaceId como parámetro
                    stime: start, // Fecha de inicio
                    etime: end,   // Fecha de fin
                    p: page,   // Página actual
                },
            });

            // Obtener datos de la página actual
            const { pageData, totalNumberOfPages } = response.data;

            // Agregar los datos obtenidos a los resultados
            results.push(...pageData);

            // Actualizar el número total de páginas
            totalPages = totalNumberOfPages;

            // Avanzar a la siguiente página
            page += 1;
        }
        logWithTimestamp("Finished fetching all pages.");
        return results; // Retornamos todos los resultados acumulados
    } catch (error) {
        logErrorWithTimestamp(error);
        //console.error("Error while fetching pages:", error.message);
        return null;
    }
}

export const getFormSubmisionById = async (formid) => {
    try {
        const response = await axios.get(`${process.env.BASE_URL}/data/${formid}`, {
            auth: {
                username: process.env.USER_TC,
                password: process.env.PASSWORD_TC,
            },
            params: {
                tenant: "", // Tenant as query parameter
            },
        });

        // Log the response data
        //console.log('Response:', response.data);
        return response.data;
    } catch (error) {
        // Handle errors
        console.error('Error fetching tenants:', error.message);
        if (error.response) {
            console.error('Error details:', error.response.data);
        }
        return null;
    }
};

export const getFormSubmisionByIdFull = async (formid) => {
    try {
        const response = await axios.get(`${process.env.BASE_URL}/data/${formid}/document.json`, {
            auth: {
                username: process.env.USER_TC,
                password: process.env.PASSWORD_TC,
            },
            params: {
                tenant: "", // Tenant as query parameter
            },
        });

        // Log the response data
        //console.log('Response:', response.data);
        return response.data;
    } catch (error) {
        // Handle errors
        console.error('Error fetching tenants:', error.message);
        if (error.response) {
            console.error('Error details:', error.response.data);
        }
        return null;
    }
};

export const getUserById = async (formid) => {
    try {
        const response = await axios.get(`${process.env.BASE_URL}/users/${formid}`, {
            auth: {
                username: process.env.USER_TC,
                password: process.env.PASSWORD_TC,
            },
            params: {
                tenant: "", // Tenant as query parameter
            },
        });

        // Log the response data
        //console.log('Response:', response.data);
        return response.data;
    } catch (error) {
        // Handle errors
        console.error('Error fetching tenants:', error.message);
        if (error.response) {
            console.error('Error details:', error.response.data);
        }
        return null;
    }
};