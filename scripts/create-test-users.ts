import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ifmwepbepoujfnzisrjz.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmbXdlcGJlcG91amZuemlzcmp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODQzODIsImV4cCI6MjA3NTM2MDM4Mn0.itUOgm94FL8dRPPiNz3TYZm4ca4e8LWlB-FNzrL9298";

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const defaultProfileImage =
  "https://media.istockphoto.com/id/1223671392/vector/default-profile-picture-avatar-photo-placeholder-vector-illustration.jpg?s=612x612&w=0&k=20&c=s0aTdmT5aU6b8ot7VKm11DeID6NctRCpB755rA1BIP0=";

const testUsers = [
  { name: "Elad", userCode: "Elad@123" },
  { name: "Yalon", userCode: "Yalon@123" },
  { name: "Itai", userCode: "Itai@123" },
  { name: "Hadar", userCode: "Hadar@123" },
  { name: "Gal", userCode: "Gal@123" },
];

async function createTestUsers() {
  console.log("👥 Creating test users...\n");

  for (const user of testUsers) {
    try {
      const email = `${user.name.toLowerCase()}@test.com`;
      const password = "test12345678"; // Password that meets Supabase's 12 char minimum

      console.log(`Creating user: ${user.name} (${email})`);

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: user.name,
            profilePicture: defaultProfileImage,
          },
        },
      });

      if (authError) {
        console.error(`❌ Error creating auth user for ${user.name}:`, authError.message);
        // Try to continue - maybe user already exists
        continue;
      }

      if (!authData.user) {
        console.error(`❌ No user returned for ${user.name}`);
        continue;
      }

      console.log(`  ✅ Auth user created: ${authData.user.id}`);

      // Wait a bit for any triggers to run
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("uid")
        .eq("uid", authData.user.id)
        .single();

      if (existingProfile) {
        // Update existing profile with correct userCode
        console.log(`  📝 Profile exists, updating userCode...`);
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            name: user.name,
            userCode: user.userCode,
            email: email,
          })
          .eq("uid", authData.user.id);

        if (updateError) {
          console.error(`  ❌ Error updating profile:`, updateError.message);
        } else {
          console.log(`  ✅ Profile updated with userCode: ${user.userCode}`);
        }
      } else {
        // Create profile
        console.log(`  📝 Creating profile...`);
        const { error: profileError } = await supabase.from("profiles").insert({
          uid: authData.user.id,
          email: email,
          name: user.name,
          profilePicture: defaultProfileImage,
          conversations: [],
          userCode: user.userCode,
        });

        if (profileError) {
          // Check if it's a duplicate key error (trigger already created it)
          if (profileError.code === "23505") {
            console.log(`  📝 Profile already exists (created by trigger), updating...`);
            const { error: updateError } = await supabase
              .from("profiles")
              .update({
                name: user.name,
                userCode: user.userCode,
              })
              .eq("uid", authData.user.id);

            if (updateError) {
              console.error(`  ❌ Error updating profile:`, updateError.message);
            } else {
              console.log(`  ✅ Profile updated with userCode: ${user.userCode}`);
            }
          } else {
            console.error(`  ❌ Error creating profile:`, profileError.message);
          }
        } else {
          console.log(`  ✅ Profile created with userCode: ${user.userCode}`);
        }
      }

      console.log(`  📧 Email: ${email}`);
      console.log(`  🔑 Password: ${password}`);
      console.log(`  🆔 User Code: ${user.userCode}\n`);
    } catch (error: any) {
      console.error(`❌ Unexpected error creating ${user.name}:`, error.message);
      console.log("");
    }
  }

  console.log("✅ Test user creation complete!");
}

createTestUsers();
