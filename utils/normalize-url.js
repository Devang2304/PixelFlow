
const normalisedUrl = (url) => {
    let w,h,q;
    // url => https://my-cdn.com/image.png?w=200&h=200&q=50
    let urlParts = url.split('/');
    console.log(urlParts) // [ 'https:', '', 'my-cdn.com', 'image.png?w=200&h=200&q=50' ]
    let lastPart = urlParts[urlParts.length - 1];
    let imageName = lastPart.split('?')[0];
    const supportedExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'];
    let extension = imageName.split('.')[1];
    if(!supportedExtensions.includes(extension)){
        console.error('Unsupported image format');
        return;
    }
    let params = lastPart.split('?')[1];
    let paramsArray = params.split('&');
    console.log(paramsArray) // [ 'w=200', 'h=200', 'q=50' ]
    let makeLowerCaseIfNot = paramsArray.map((param) => {
        if(!param.includes('w=') || !param.includes('h=') || !param.includes('q=')){
            return param.toLowerCase();
        }
        return param;
    });
    makeLowerCaseIfNot.forEach((param) => {
        if(param.includes('w=')){
            w = Number(param.split('=')[1]);
        }
        if(param.includes('h=')){
            h = Number(param.split('=')[1]);
        }
        if(param.includes('q=')){
            q = Number(param.split('=')[1]);
        }
        });

    if(w < 0 || w===NaN || w===undefined){
        w = 0;
    }
    if(h < 0 || h===NaN || h===undefined){
        h = 0;
    }
    if(q < 0 || q===NaN || q===undefined){
        q = 50;
    }
    if(!w && h){
        w=h;
    }
    if(!h && w){
        h=w;
    }
    if(!q){
        q=75;
    }

    console.log(`Image Name: ${imageName}`);
    console.log(`Width: ${w} , typeof: ${typeof w}`);
    console.log(`Height: ${h}`);
    console.log(`Quality: ${q}`);


}

normalisedUrl('https://my-cdn.com/image?h=200&w=200&w=500&q=50');