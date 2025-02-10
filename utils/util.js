import { getImageProof, uploadFileFromBytes } from "../api/hubspot.js";

export const logWithTimestamp = (message) => {
    const now = new Date().toISOString();
    console.log(`[${now}] ${message}`);
};

export const logErrorWithTimestamp = (error) => {
    const now = new Date().toISOString();
    console.error(`[${now}] ${error.message}`);
};

export const getFirstAndLastDateOfCurrentMonth = () => {
    const now = new Date();

    // Get the current year and month
    const year = now.getUTCFullYear(); // Use getFullYear() if working with local time
    const month = now.getUTCMonth() + 1; // Use getMonth() + 1 if working with local time (0-indexed)

    // Get the first and last dates of the current month
    const firstDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)).toISOString();

    // Last date: Set time to 23:59:59.999
    const lastDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)).toISOString();

    return { firstDate, lastDate };
};

export const getDay = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

export const searchByLabel = (data, label) => {
    if (!data || typeof data !== "object") return null;

    // If the object contains the desired label, return the object
    if (data.label === label) {
        return data;
    }

    // If it's an array, recursively search each item
    if (Array.isArray(data)) {
        for (const item of data) {
            const result = searchByLabel(item, label);
            if (result) return result;
        }
    }

    // If it's an object, recursively search its values
    for (const key in data) {
        const result = searchByLabel(data[key], label);
        if (result) return result;
    }

    return null; // Return null if not found
};

export const getCompanyName = (data) => {
    let name = "";
    if(data["ProspectoLista"] !== ""){
        name = data["ProspectoLista"];
    } else if (data["BusquedaPorNombre"] !== ""){
        name = data["BusquedaPorNombre"];
    } else if (data["NombreProspecto"] !== ""){
        name = data["NombreProspecto"];
    }else{
        name = "";
    }
    return name;
};


export const extractLabelsToObject = async ( data, labels ) => {
    const resultObject = {};
    let result = {};
    for ( const label of labels ) {   
        result = searchByLabel(data, label);
        if (result) {
            if( label === 'GerenteRegional') {
                resultObject[label] = result.values[0] || "";
            } else if(label === 'NoClienteMedico'){
                resultObject[label] = result.values[0] || "";  
            } else if(label === 'AliasDelCliente'){
                resultObject[label] = result.values[0] || "";  
            } else if(label === 'NombreDelCliente'){
                resultObject[label] = result.values[0] || "";  
            } else if(label === 'Asesor'){
                resultObject[label] = result.values[0] || "";  
            } else if(label === 'ObjetivoDeLaVisita'){
                resultObject[label] = result.values[0] || "";  
            } else if(label === 'TipoVisita'){
                resultObject[label] = result.values[0] || "";  
            } else if(label === 'TipoProspecto'){
                resultObject[label] = result.values[0] || "";  
            } else if(label === 'Especialidad'){
                resultObject[label] = result.values[0] || "";  
            } else if(label === 'NombreProspecto'){
                resultObject[label] = result.values[0] || "";  
            } else if(label === 'ProspectoLista'){
                resultObject[label] = result.values[0] || "";  
            } else if(label === 'Acompañamiento'){
                resultObject[label] = result.values[0] || "";  
            } else if(label === 'ConcretoLaVisita'){
                resultObject[label] = result.values[0] || "";  
            } else if(label === 'ConQuienAgendoVisita'){
                resultObject[label] = result.values[0] || "";  
            } else if(label === 'CompraAOtroLab'){
                resultObject[label] = result.values[0] || "";  
            } else if(label === 'NivelDeInteresVisita'){
                resultObject[label] = result.values[0] || "";  
            } else if(label === 'TipoDeCliente'){
                resultObject[label] = result.values[0] || "";  
            } else if(label === 'TipoDeProductos'){
                resultObject[label] = result.values[0] || "";  
            } else if(label === 'EnfoqueNegocio'){
                resultObject[label] = result.values[0] || "";  
            } else if(label === 'ComentariosOpcionale'){
                resultObject[label] = result.values[0] || "";  
            } else if(label === 'EvidenciaVisita'){
                if (result.values.length > 0){
                    //resultObject[label] = "";
                    resultObject[label] = await uploadFileFromBytes(result.values[0]);
                }     
            }  else if(label === 'BusquedaPorNombre'){
                resultObject[label] = result.answers?.[0]?.values?.[0] || "";  
            }     
        }

    }
    resultObject["Fecha"] = data.geoStamp?.captureTimestamp?.provided?.time || "";
    resultObject["identifier"] = data.identifier || "";
    resultObject["direccion"] = data.geoStamp?.address || "";
    resultObject["name"] = data.name || "";
    resultObject["referencia"] = data.referenceNumber || "";

    const coordinates = data.geoStamp?.coordinates;

    if (coordinates) {
        const { latitude, longitude } = coordinates;
        if (latitude && longitude) {
            resultObject["coordenadas"] = `https://www.google.com/maps?q=${latitude},${longitude}`;
        } else {
            resultObject["coordenadas"] = ""; // Fallback if latitude or longitude is missing
        }
    } else {
        resultObject["coordenadas"] = ""; // Fallback if coordinates are null or undefined
    }

    return resultObject;
};